# log

## 2026-07-18

- **上午** 起源：读了 Obsidian 笔记《LLM 推理复杂度、流程控制架构与可观测性量化》，讨论怎么落地
- **中午** 收敛做法：先搭度量与观察的脚手架，不急着改 aie-pm / methodology
- **中午 → 下午** 数据模型多轮迭代：
  - 从 5 实体（含 Label / Event）收敛为 4 实体（Conversation / UserInput / Generation / ToolCall），Label 延后、Event 并入 Generation 字段
  - Generation ↔ ToolCall 改为因果链而非包含关系（Generation emit ToolCall；ToolCall 结果作为下一 Generation 输入）
  - Conversation 从"has UserInput"改为"纯容器"，UserInput 通过 Generation.trigger 关联进来
  - 加 `initial_spawn` trigger type 表达子 conv 的第一次生成
  - 多模态：ContentBlock 支持 image/file/audio；文本和 tool args/result 统一 `{digest, length, inline_text?, blob_path?}` 结构
  - 兼容性检查：Claude Code 全覆盖；Devin 核心执行链能覆盖，但编排层内部决策不在模型范围内
- **下午** 阶段 1 MVP 全自动实施：
  - `hook.sh`：flock 换 fcntl.flock（macOS 无 flock）；stdin 通过临时文件传给 heredoc 里的 python（避免 heredoc 抢占 stdin）
  - 装配器：识别 Claude Code transcript 里 user/assistant/system 消息，跳过 queue-operation / attachment / ai-title 等内部条目；trigger 靠时序 + tool_use_id 匹配
  - 发现关键点：子 agent 的 transcript 独立存在 `<project>/<session>/subagents/agent-<id>.jsonl`，配 `.meta.json` 含 `toolUseId`；子 agent 的内部工具调用也走父 session 的 Pre/PostToolUse hook
  - viewer：DATA_BASE 用绝对路径 `/.aie/observations/assembled`；从 target 项目根起 server
- **傍晚** 目录整理两轮：
  - 第一轮：把 `.aie/` 下的代码 + `docs/observation-data-model.md` + `.claude/hooks/aie-observe.sh` 搬到 `projects/ai-observation/`（当子项目）；`.aie/` 只留数据
  - 第二轮（本次）：受管工程软链从 `projects/` 挪到 `receivers/`；发现 `projects/` 应该跟被管工程一样按 initiative 容器约定用 → 把源码从 `projects/ai-observation/` 挪到根级 `ai-observation/`（跟 `methodology/` 同级），`projects/ai-observation/` 只留 `overview.md` / `tasks.md` / `log.md`

## 待记

- 阶段 2 开工前：跟用户对齐 Label 的采集 UX（viewer 内嵌打标 vs 独立 CLI）
