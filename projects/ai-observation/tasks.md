# tasks

## 阶段 1 — MVP：采集 + 装配 + 浏览

- ✅ 数据模型确定（`ai-observation/docs/data-model.md`）：Conversation / UserInput / Generation / ToolCall + 多态 trigger + hooks 就近挂靠 + 多模态 ContentBlock
- ✅ Hook 采集脚本（`hook.sh`）：8 类 hook 共用，fcntl.flock 并发原子，只读
- ✅ hook 注册到 ai-excellence `.claude/settings.json`（本工程作为首个 dogfood target）
- ✅ 子对话可见性验证：Explore 子 agent 有独立 transcript（`~/.claude/projects/<proj>/<session>/subagents/agent-<id>.jsonl`），meta 里含 `toolUseId` 可挂父
- ✅ 装配器（`assemble.py`）：raw JSONL + Claude transcript + 子 agent transcript → 结构化 Conversation JSON
- ✅ Web viewer：会话列表 + 时间线 + trigger 链接 + 子对话跳转
- ✅ 一键脚本（`open.sh`）：装配 → 起 server → 打开浏览器
- ✅ 首次端到端联调（当前 session 152 Generation / 76 ToolCall / 24 UserInput 全部装配成功）

## 阶段 2 — Label + Blob

- 🔘 Label 实体设计（target_type / effect / failure_modes / notes）
- 🔘 Label 采集 UX（在 viewer 上直接打标）
- 🔘 Blob offload：超过阈值的 text / 二进制内容存 `.aie/observations/blobs/<hash>`，实体记录只挂 `blob_path`
- 🔘 多模态 ContentBlock 落地：image / file / audio 走 blob 路径

## 阶段 3 — 复杂度 + 多 orchestrator

- 🔘 三维复杂度打分模型（输入 / 推理 / 架构）与观察数据关联
- 🔘 Devin adapter：能把 Devin session 数据导入本模型
- 🔘 分析工具：统计"打分 vs 实际行为指标"的相关性

## 阶段外 — 规范化

- 🔘 通过 `/aie-apply` 把 ai-observation 部署包装成"可选特性"，一键推给任意受管工程
