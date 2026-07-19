# ai-observation 模块

## 定位

一套用来**度量与观察 AI 代理执行过程**的能力模块（源码，跟 `methodology/` 同级）。可作为可选特性通过 `/aie-apply` 部署到任意 target 项目（包括 ai-excellence 自身，我们首个 dogfood 目标）。

进展、任务、决策记录见 initiative 目录 [`projects/ai-observation/`](../projects/ai-observation/)。

数据模型见 [docs/data-model.md](docs/data-model.md)：Conversation / UserInput / Generation / ToolCall + Label（待引入），支持多模态、hooks 就近挂靠、子对话派生。

## 组成

- `hook.sh` — Claude Code hook 采集脚本，8 类 hook 共用。只读采集，fcntl.flock 并发原子
- `assemble.py` — 装配器：raw JSONL + Claude Code transcript → 结构化 Conversation JSON
- `viewer/` — 静态 web viewer（HTML + JS + CSS）
- `open.sh` — 一键：跑装配 + 起 http server + 打开浏览器
- `docs/data-model.md` — 数据模型定义（唯一权威）

## 数据落地

数据落到 **target 项目**的 `.aie/observations/` 下：
- `.aie/observations/raw/<session_id>.jsonl` —— hook 原始事件流
- `.aie/observations/assembled/<conv_id>.json` —— 装配后的实体记录
- `.aie/observations/assembled/index.json` —— 会话索引，viewer 用
- `.aie/observations/blobs/` —— 大文本/多模态原件（未来阶段）

**代码在本模块里，数据在 target 项目的 .aie/ 里** —— 严格分离。

## 部署到 target 项目

需要 target 项目 `.claude/settings.json` 里挂 8 类 hook 指向本模块的 `hook.sh`：

```json
{
  "hooks": {
    "SessionStart":     [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "PreToolUse":       [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "PostToolUse":      [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "SubagentStop":     [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "Notification":     [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }],
    "PreCompact":       [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/ai-observation/hook.sh" }] }]
  }
}
```

同时 target 项目 `.gitignore` 应加 `.aie/`。

（当 ai-observation 通过 `/aie-apply` 正式规范化后，上述部署由命令自动完成，不用手动配。）

## 使用

在 target 项目根目录跑：
```
./ai-observation/open.sh
```
—— 自动装配数据、起本地 server、开浏览器。

或分步：
```
python3 ./ai-observation/assemble.py    # 装配
python3 -m http.server 8765 --directory .        # 起服务
open http://127.0.0.1:8765/ai-observation/viewer/index.html
```
