# 集成：DCDDP 系统建模方法论

> 集成入口文档：解释怎么把本仓库 `methodology/` 下的系统建模方法论启用到受管工程。

## 是什么

DCDDP 系统建模方法论是一套描述系统结构的语言：4 视图分层、Overview-Details 递归、三层用例结构、声明式 What/How 分离。

**方法论本体（路径相对本仓库根）**：

- 总览与定位：`methodology/vision.md`
- 建模约定：`methodology/modeling-conventions.md`
- 元模型 schema：`methodology/meta-model.schema.yaml`
- AI 建模 prompt：`methodology/system-modeling-prompt.md`
- 参考样板：`methodology/examples/chargable-proxy/`
- viewer 应用：`methodology/app/`

## 启用方式（自然语言对话）

被管工程**默认不启用**。启用与否由用户在运行 `/aie-apply` 时决定：

- 调用命令时直接表达意图（如"`/aie-apply wechat-msg-collector`，给它启用建模"），命令据此处理。
- 没表达 → `/aie-apply` 在审查阶段直接询问用户：是否为本工程启用 system-modeling？
- 决定写入被管工程 CLAUDE.md 的"## ai-excellence 可选规范"段（`✅` 启用 / `❌` 拒绝），下次不再询问。

## 启用后的效果

`/aie-apply` 推送（合并而非覆盖）：

1. **CLAUDE.md 中追加"## 系统建模方法论（DCDDP v6.2）"段**：含核心约定摘要、真身路径指针、AI 行为指引。
2. **`.claude/skills/model-view/SKILL.md`**：本地启动 viewer 加载本工程模型。

CLAUDE.md 是常驻 context，所以方法论"贯穿所有 AI 交流"——讨论 bug、设计、实现都自动按本方法论的语言进行。

## 路径耦合

受管工程的 CLAUDE.md / skill 文件含 `<aie-root>` 占位符，本机绝对路径写在 receiver 的 `.claude/settings.local.json` 的 `aie_root` 字段（gitignored）。AI 在 Read 方法论文件前先读 settings.local.json 解析占位符。

这样做的好处：
- ai-excellence 与受管工程的 committed 文件都不含本机路径，可公开
- 多机协作时每台机器只需在 settings.local.json 写自己 clone 的实际位置
- 迁移机器只需改一处
