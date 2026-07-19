#!/usr/bin/env python3
"""
AI 观察数据装配器（阶段 1 MVP）

输入：
- .aie/observations/raw/<session_id>.jsonl（hook 采集的事件流）
- ~/.claude/projects/<project>/<session_id>.jsonl（Claude Code 主 transcript）
- ~/.claude/projects/<project>/<session_id>/subagents/agent-<id>.jsonl（子对话 transcript + .meta.json）

输出：
- .aie/observations/assembled/<conv_id>.json（每个 conversation 一个文件，含所有 UserInput / Generation / ToolCall / HookEvent）
- .aie/observations/assembled/index.json（会话索引，viewer 用）

数据模型见 docs/observation-data-model.md。
"""

from __future__ import annotations
import json
import os
import sys
import glob
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone


def parse_iso_ts(s):
    """把 '2026-07-18T04:00:11.692Z' 之类转成 unix 秒（float）；已经是 float 直接返回。"""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    try:
        # Python 3.11+ 的 fromisoformat 支持 'Z'；旧版本手动替换
        if s.endswith("Z"):
            s2 = s[:-1] + "+00:00"
        else:
            s2 = s
        return datetime.fromisoformat(s2).replace(tzinfo=timezone.utc).timestamp() if "+" not in s2 else datetime.fromisoformat(s2).timestamp()
    except Exception:
        return None


# target 项目根：优先 --target CLI 参数；其次 $CLAUDE_PROJECT_DIR；最后 cwd
def _resolve_target_root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--target" and i + 1 < len(argv):
            return Path(argv[i + 1]).resolve()
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()


PROJECT_ROOT = _resolve_target_root()
AIE_ROOT = PROJECT_ROOT / ".aie"
RAW_DIR = AIE_ROOT / "observations" / "raw"
OUT_DIR = AIE_ROOT / "observations" / "assembled"


def encode_project_path(project_root: Path) -> str:
    """Claude Code 用 '-' 替换路径 '/' 做项目目录名"""
    return "-" + str(project_root).replace("/", "-").lstrip("-")


def find_transcripts(session_id: str):
    """返回 (main_transcript_path, [(subagent_meta_path, subagent_jsonl_path), ...])"""
    encoded = encode_project_path(PROJECT_ROOT)
    base = Path.home() / ".claude" / "projects" / encoded
    main = base / f"{session_id}.jsonl"
    subagents_dir = base / session_id / "subagents"
    subagents = []
    if subagents_dir.is_dir():
        for meta in sorted(subagents_dir.glob("*.meta.json")):
            jsonl = meta.with_suffix("").with_suffix(".jsonl")
            if jsonl.exists():
                subagents.append((meta, jsonl))
    return main, subagents


def load_jsonl(path: Path):
    out = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def load_raw_events(session_id: str):
    """加载采集 hook 事件流"""
    p = RAW_DIR / f"{session_id}.jsonl"
    if not p.exists():
        return []
    return load_jsonl(p)


def index_hooks_by_tool_use_id(raw_events):
    """按 tool_use_id 归组 Pre/PostToolUse，便于跟 transcript 的 tool_use 匹配"""
    idx = defaultdict(list)
    for ev in raw_events:
        p = ev.get("payload", {})
        tid = p.get("tool_use_id")
        if tid:
            idx[tid].append(ev)
    return idx


def classify_user_content(content):
    """
    区分 user turn 的性质：
      - 'user_input'  : 含 text（用户主动输入）
      - 'tool_results': 只含 tool_result（前一批工具结果）
      - 'mixed'       : 兼有
      - 'empty'       : 什么都没有 / attachment 类
    返回 (kind, text_blocks, tool_result_blocks)
    """
    if isinstance(content, str):
        return "user_input", [content], []
    if not isinstance(content, list):
        return "empty", [], []
    texts = []
    tool_results = []
    for c in content:
        if not isinstance(c, dict):
            continue
        t = c.get("type")
        if t == "text":
            texts.append(c.get("text", ""))
        elif t == "tool_result":
            tool_results.append(c)
    if texts and tool_results:
        return "mixed", texts, tool_results
    if texts:
        return "user_input", texts, []
    if tool_results:
        return "tool_results", [], tool_results
    return "empty", [], []


def extract_assistant_output(content):
    """从 assistant message.content 抽取 text / thinking / tool_use blocks"""
    text_parts = []
    thinking_parts = []
    tool_uses = []
    if not isinstance(content, list):
        return "", "", []
    for c in content:
        if not isinstance(c, dict):
            continue
        t = c.get("type")
        if t == "text":
            text_parts.append(c.get("text", ""))
        elif t == "thinking":
            thinking_parts.append(c.get("thinking", ""))
        elif t == "tool_use":
            tool_uses.append(c)
    return "\n".join(text_parts), "\n".join(thinking_parts), tool_uses


def text_field(text: str):
    """Payload 结构：{ digest, length, inline_text?, blob_path? }。MVP 直接 inline。"""
    if not text:
        return None
    import hashlib
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    # 阶段 1：短文本直接 inline；未来超过阈值走 blob
    if len(text) <= 8000:
        return {"digest": digest, "length": len(text), "inline_text": text}
    return {"digest": digest, "length": len(text), "inline_text": text[:8000] + "...[truncated]"}


def build_conversation(transcript_entries, conv_id: str, raw_events, spawned_by_tool_call_id=None,
                       subagent_type=None, meta=None):
    """
    从 transcript 条目 + raw hook events 装配一个 Conversation。
    返回 dict（对应数据模型）。
    """
    hooks_by_tid = index_hooks_by_tool_use_id(raw_events)

    # 过滤：只保留 user / assistant / system
    relevant = [e for e in transcript_entries if e.get("type") in ("user", "assistant", "system")]

    user_inputs = []       # UserInput 实体
    generations = []       # Generation 实体
    tool_calls = []        # ToolCall 实体
    conv_model = None
    started_at = None
    ended_at = None

    # 状态：最近一次 UserInput 的 id（用于 trigger.user_input），最近一批 ToolCall 的 id
    last_user_input_id = None
    pending_tool_call_ids = []   # 尚未被 Generation 消费的 tool 结果对应的 tool_call ids

    # 遍历 turn，按顺序装配
    is_first_assistant_of_subagent = (spawned_by_tool_call_id is not None)

    for entry in relevant:
        ts = entry.get("timestamp")
        if ts:
            started_at = started_at or ts
            ended_at = ts
        etype = entry["type"]

        if etype == "user":
            msg = entry.get("message", {})
            kind, texts, tool_results = classify_user_content(msg.get("content"))
            if kind in ("user_input", "mixed"):
                ui_id = entry.get("uuid") or entry.get("promptId")
                if ui_id:
                    combined = "\n".join(texts)
                    user_inputs.append({
                        "id": ui_id,
                        "conversation_id": conv_id,
                        "seq_no": len(user_inputs),
                        "content": [{"type": "text", **(text_field(combined) or {})}] if combined else [],
                        "attachments": [],
                        "kind": "new_task" if len(user_inputs) == 0 else "follow_up",
                        "is_interrupt": False,
                        "submitted_at": ts,
                    })
                    last_user_input_id = ui_id
                    pending_tool_call_ids = []
            if kind in ("tool_results", "mixed"):
                # 记录哪些 tool_call_id 的结果在这批里 —— 供下一次 Generation 挂 trigger
                pending_tool_call_ids = [tr.get("tool_use_id") for tr in tool_results if tr.get("tool_use_id")]
                # 顺便把 result 填回对应 ToolCall
                for tr in tool_results:
                    tid = tr.get("tool_use_id")
                    if not tid:
                        continue
                    for tc in tool_calls:
                        if tc["id"] == tid:
                            r_content = tr.get("content")
                            if isinstance(r_content, list):
                                r_text = "\n".join(c.get("text", "") if isinstance(c, dict) else str(c) for c in r_content)
                            else:
                                r_text = str(r_content) if r_content is not None else ""
                            tc["result"] = {**(text_field(r_text) or {"length": 0, "digest": ""}),
                                            "status": "error" if tr.get("is_error") else "success"}
                            break

        elif etype == "assistant":
            msg = entry.get("message", {})
            if not conv_model:
                conv_model = msg.get("model")
            text_out, thinking_out, tool_uses = extract_assistant_output(msg.get("content"))
            usage = msg.get("usage", {}) or {}
            gen_id = entry.get("uuid")

            # 确定 trigger
            if is_first_assistant_of_subagent:
                trigger = {"type": "initial_spawn", "payload": {"spawning_tool_call_id": spawned_by_tool_call_id}}
                is_first_assistant_of_subagent = False
            elif pending_tool_call_ids:
                trigger = {"type": "tool_results", "payload": {"tool_call_ids": list(pending_tool_call_ids)}}
                pending_tool_call_ids = []
            elif last_user_input_id:
                trigger = {"type": "user_input", "payload": {"user_input_id": last_user_input_id}}
                last_user_input_id = None  # 消费掉
            else:
                trigger = {"type": "unknown", "payload": {}}

            generation = {
                "id": gen_id,
                "conversation_id": conv_id,
                "seq_no": len(generations),
                "trigger": trigger,
                "output_text": text_field(text_out),
                "thinking_text": text_field(thinking_out),
                "tokens": {
                    "input": usage.get("input_tokens"),
                    "output": usage.get("output_tokens"),
                    "cache_read": usage.get("cache_read_input_tokens"),
                    "cache_write": usage.get("cache_creation_input_tokens"),
                },
                "stop_reason": msg.get("stop_reason"),
                "hooks": [],  # 稍后填
                "started_at": ts,
                "ended_at": ts,
            }
            generations.append(generation)

            # 从这个 assistant turn 抽取 ToolCall
            for tu in tool_uses:
                tid = tu.get("id")
                tc_hooks = hooks_by_tid.get(tid, [])
                pre_hook = next((h for h in tc_hooks if h["hook"] == "PreToolUse"), None)
                post_hook = next((h for h in tc_hooks if h["hook"] == "PostToolUse"), None)
                args_text = json.dumps(tu.get("input", {}), ensure_ascii=False)
                tool_call = {
                    "id": tid,
                    "conversation_id": conv_id,
                    "requested_by_generation_id": gen_id,
                    "seq_no": len([x for x in tool_calls if x["requested_by_generation_id"] == gen_id]),
                    "name": tu.get("name"),
                    "args": text_field(args_text),
                    "result": None,  # 稍后填
                    "latency_ms": (post_hook or {}).get("payload", {}).get("duration_ms"),
                    "needed_permission": False,  # 阶段 1 未捕获决策
                    "spawned_conversation_id": None,  # 稍后填（外层做）
                    "hooks": [
                        {"name": h["hook"], "phase": "before" if h["hook"] == "PreToolUse" else "after",
                         "fired_at": h["t"], "payload_digest": None}
                        for h in tc_hooks
                    ],
                    "started_at": (pre_hook or {}).get("t"),
                    "ended_at": (post_hook or {}).get("t"),
                }
                tool_calls.append(tool_call)

    # 把与 tool_call 无关的 hook 分类挂载
    conv_hooks = []
    # 先按 Generation seq/time 建索引，粗略地把 UserPromptSubmit / Stop / PreCompact 挂到最近的 Generation
    generation_by_time = sorted(
        [(parse_iso_ts(g["started_at"]), g) for g in generations if g["started_at"]],
        key=lambda x: (x[0] is None, x[0]),
    )
    for ev in raw_events:
        hook = ev["hook"]
        p = ev.get("payload", {})
        if p.get("tool_use_id"):
            continue  # 已挂 ToolCall
        item = {"name": hook, "phase": None, "fired_at": ev["t"], "payload_digest": None}
        if hook in ("SessionStart", "SessionEnd", "Notification", "SubagentStop"):
            conv_hooks.append(item)
        elif hook in ("UserPromptSubmit", "Stop", "PreCompact"):
            # 粗略：挂到时间上最近的 Generation
            target = None
            for gts, g in generation_by_time:
                if gts and gts >= ev["t"]:
                    target = g
                    break
            if target is None and generation_by_time:
                target = generation_by_time[-1][1]
            if target is not None:
                target["hooks"].append(item)
            else:
                conv_hooks.append(item)
        else:
            conv_hooks.append(item)

    conversation = {
        "id": conv_id,
        "spawned_by_tool_call_id": spawned_by_tool_call_id,
        "root_conversation_id": None,   # 装配层再填
        "agent_type": subagent_type or "claude",
        "subagent_type": subagent_type,
        "model": conv_model,
        "started_at": started_at,
        "ended_at": ended_at,
        "hooks": conv_hooks,
        "user_inputs": user_inputs,
        "generations": generations,
        "tool_calls": tool_calls,
        "meta": meta or {},
    }
    return conversation


def assemble_session(session_id: str):
    """装配一个 session（顶层 conv + 所有子对话）。返回 [conversation_dict, ...]"""
    main_transcript, subagent_files = find_transcripts(session_id)
    if not main_transcript.exists():
        print(f"[warn] main transcript missing: {main_transcript}", file=sys.stderr)
        return []

    raw_events = load_raw_events(session_id)

    convs = []

    # 主 conv
    main_entries = load_jsonl(main_transcript)
    root = build_conversation(main_entries, session_id, raw_events, spawned_by_tool_call_id=None)
    root["root_conversation_id"] = session_id
    convs.append(root)

    # 子 conv
    tool_call_index = {tc["id"]: tc for tc in root["tool_calls"]}
    for meta_path, jsonl_path in subagent_files:
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
        agent_id = jsonl_path.stem
        tool_use_id = meta.get("toolUseId")
        child_entries = load_jsonl(jsonl_path)
        child = build_conversation(
            child_entries, agent_id, raw_events,
            spawned_by_tool_call_id=tool_use_id,
            subagent_type=meta.get("agentType"),
            meta=meta,
        )
        child["root_conversation_id"] = session_id
        # 双向链接：父 ToolCall.spawned_conversation_id
        if tool_use_id and tool_use_id in tool_call_index:
            tool_call_index[tool_use_id]["spawned_conversation_id"] = agent_id
        convs.append(child)

    return convs


def write_output(convs):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for c in convs:
        p = OUT_DIR / f"{c['id']}.json"
        p.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")

    # 更新 index.json（追加/覆盖）
    idx_path = OUT_DIR / "index.json"
    if idx_path.exists():
        try:
            index = json.loads(idx_path.read_text(encoding="utf-8"))
        except Exception:
            index = {"conversations": []}
    else:
        index = {"conversations": []}

    existing_ids = {c["id"] for c in index["conversations"]}
    for c in convs:
        entry = {
            "id": c["id"],
            "root_conversation_id": c["root_conversation_id"],
            "spawned_by_tool_call_id": c["spawned_by_tool_call_id"],
            "agent_type": c["agent_type"],
            "subagent_type": c["subagent_type"],
            "model": c["model"],
            "started_at": c["started_at"],
            "ended_at": c["ended_at"],
            "counts": {
                "user_inputs": len(c["user_inputs"]),
                "generations": len(c["generations"]),
                "tool_calls": len(c["tool_calls"]),
            },
        }
        if c["id"] in existing_ids:
            index["conversations"] = [x for x in index["conversations"] if x["id"] != c["id"]]
        index["conversations"].append(entry)

    index["conversations"].sort(key=lambda x: (x["root_conversation_id"] or "", x["spawned_by_tool_call_id"] or ""))
    idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")


def all_session_ids():
    """从 raw 目录列出所有 session"""
    if not RAW_DIR.is_dir():
        return []
    return sorted(p.stem for p in RAW_DIR.glob("*.jsonl") if p.stat().st_size > 0)


def main():
    # 剥离已被 _resolve_target_root 消费的 --target VALUE，剩下的当 session id
    argv = sys.argv[1:]
    positional = []
    i = 0
    while i < len(argv):
        if argv[i] == "--target":
            i += 2
            continue
        if argv[i] == "--all":
            i += 1
            continue
        positional.append(argv[i])
        i += 1

    sessions = positional if positional else all_session_ids()

    total_convs = 0
    for sid in sessions:
        convs = assemble_session(sid)
        write_output(convs)
        total_convs += len(convs)
        print(f"[ok] {sid}: {len(convs)} conversation(s) assembled")

    print(f"\nDone. {total_convs} conversation file(s) written to {OUT_DIR}")


if __name__ == "__main__":
    main()
