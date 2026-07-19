# ai-observation

## 目标

为 AI 代理（Claude Code / Devin 等）执行过程建立可复用的**观察与度量**能力：

- 把每次对话的 UserInput / Generation / ToolCall / 子对话派生等原子事件结构化记录下来
- 记录得能支撑事后的人工评估（label）与统计分析
- 数据模型独立于具体 orchestrator，未来能兼容多种 agent 系统

## 用户价值

- **开发者复盘**：可视化地回看某次任务里 AI 做了什么、在哪一步跑偏、哪些工具用错了
- **协作规范验证**：为 AI 协作规范（`/aie-apply` 推的那些）的效果提供可度量的反馈
- **模型 / 任务复杂度关联**：为后续"三维复杂度打分"的相关性研究提供底料

## 验收口径

- 阶段 1（当前）：Claude Code 顶层 + 子对话执行数据能被自动采集、装配、通过 web viewer 浏览
- 阶段 2：人工评估工作流可用（Label 挂到任一实体）
- 阶段 3：三维复杂度打分能跟观察数据对齐；至少一个非 Claude Code 的 adapter 跑通

## 源码位置

代码在 [`../ai-observation/`](../../ai-observation/)（跟 `methodology/` 同为顶级能力模块）。本目录只做 initiative 跟踪。
