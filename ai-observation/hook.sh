#!/usr/bin/env bash
# AI 观察数据采集 hook
# - 只读采集，不干预（读 stdin，写 JSONL，退出 0）
# - 所有 hook 事件共用；事件类型由 stdin.hook_event_name 区分
# - target 项目由 $CLAUDE_PROJECT_DIR 定位（Claude Code 会自动设置）；缺失时回退到 stdin.cwd 或 $PWD
# - fcntl.flock 保证并发原子
# - 任何异常都静默退出 0（观察不能影响被观察者）

TARGET_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
export AIE_OBS_DIR="$TARGET_ROOT/.aie/observations/raw"

# 把 stdin 落到临时文件，让下面 heredoc 内的 python 从文件读（heredoc 会占用 python 的 stdin）
TMP="$(mktemp -t aie-hook-in.XXXXXX)"
trap 'rm -f "$TMP"' EXIT
cat > "$TMP"
export AIE_INPUT_FILE="$TMP"

/usr/bin/python3 - <<'PY' 2>/dev/null || true
import fcntl, json, os, sys, time

obs_dir = os.environ["AIE_OBS_DIR"]
os.makedirs(obs_dir, exist_ok=True)

try:
    with open(os.environ["AIE_INPUT_FILE"], "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()
    payload = json.loads(raw) if raw.strip() else {}
except Exception as e:
    payload = {"_parse_error": str(e), "_raw": (raw[:500] if 'raw' in dir() else "")}

session_id = payload.get("session_id") or "unknown"
raw_file = os.path.join(obs_dir, f"{session_id}.jsonl")

line = {
    "t": time.time(),
    "hook": payload.get("hook_event_name", "unknown"),
    "session_id": session_id,
    "cwd": payload.get("cwd"),
    "payload": payload,
}

try:
    fd = os.open(raw_file, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, (json.dumps(line, ensure_ascii=False) + "\n").encode("utf-8"))
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
except Exception:
    pass
PY

exit 0
