# 如何用好 AI LLM — 方法论

> **背景资料**：本文档是分层原则和上下文管理的思路总结，**不直接驱动 `/aie-apply` 的执行逻辑**。命令具体应用什么规范，以 `.claude/skills/aie-apply.md` 内嵌的内容为准。本文留作参考与扩展依据。

## 核心理念

### 写好 Prompt

"验证"应该放在第一位。

### 管理好上下文 — 设置放对地方

过多的上下文会把真正重要的信息淹没。**核心问题不是"有没有配置"，而是"设置放对了地方没有"。**必须分层管理：

| 层级 | 机制 | 适用场景 | 放错的后果 |
|------|------|----------|------------|
| 常驻约束 | CLAUDE.md | 每次对话都需要的规则和核心概念 | 放到 Skills → 忘记加载就失效 |
| 参考数据 | Rules 文件 + CLAUDE.md 指针 | 不是动作流程，但需要按需引用的业务数据、映射表、配置规则。数据放独立文件，CLAUDE.md 只放一行指针（如"SKU 映射详见 `docs/sku.md`，涉及 SKU 时先读取"） | 堆在 CLAUDE.md → 上下文膨胀；放 Skills → 性质不对，Skills 是操作流程 |
| 低频操作 | Skills | 按需加载的操作流程和步骤序列 | 堆在 CLAUDE.md → 上下文膨胀 |
| 硬性校验 | Hooks | 必须强制执行的检查 | 只写在 CLAUDE.md → 依赖 AI 自觉，不可靠 |
| 大体量探索 | Subagents | 需要大量搜索和分析的任务 | 在主对话做 → 上下文爆炸 |

**判断高频/低频必须基于对项目定位的理解。** 同样的内容在不同项目里频率不同——比如"三层用例结构"在建模方法论项目里是核心高频概念，但在普通业务项目里可能是低频参考。

同时注意全局与项目级的归属：
- **全局通用的设置**应在 `~/.claude/`（全局 CLAUDE.md、settings.json），不应重复写在每个项目里
- **项目特有的设置**应在项目级配置，不应跑到全局去影响其他项目

### 上下文开销

- **固定开销**：系统指令、启用的 Skill 描述符、MCP 工具定义、LSP 状态
- **半固定开销**：CLAUDE.md
- **动态开销**：对话历史、文件内容、工具输出

一个典型 MCP Server 可能带来 20~30 个工具定义，5 个 server 加在一起，固定开销就可能吃掉两万多 tokens。上下文在 30% 左右就开始退化。

**主动管理上下文**，别等系统自己处理。工具：`/clear`、`/compact`、`HANDOFF.md`、双击 ESC。

### Prompt Caching

Prompt Caching 决定了很多设计取舍。理解它的工作方式有助于优化 token 使用。

---

## Claude Code 工程拆解

### 六层架构

1. **任务循环**：收集上下文 → 采取行动 → 验证结果
2. **常驻契约**：CLAUDE.md、Memory、项目禁区和构建命令
3. **工作流层**：Skills、rules、可复用的执行顺序
4. **动作层**：Tools、MCP、CLI、外部系统接入
5. **控制层**：Hooks、权限、沙箱、审批和审计
6. **隔离层**：Subagents、并行调查、长任务分流

---

## 上下文管理命令

| 命令 | 用途 |
|------|------|
| `/context` | 查看 token 占用结构，排查 MCP 和文件读取占比 |
| `/clear` | 清空会话，同一问题被纠偏两次以上就重来 |
| `/compact` | 压缩但保留重点，配合 Compact Instructions |
| `/memory` | 确认哪些 CLAUDE.md 真的被加载了 |

## 系统管理命令

| 命令 | 用途 |
|------|------|
| `/mcp` | 管理 MCP 连接、检查 token 成本、断开闲置 server |
| `/hooks` | 管理 hooks，控制平面入口 |
| `/permissions` | 查看或更新权限白名单 |

## 会话和分支

| 命令 | 用途 |
|------|------|
| `claude --continue` | 恢复最近会话 |
| `claude --resume` | 从历史会话列表中选择 |
| `claude --continue --fork` | 从已有会话分叉，同一起点不同方案 |

## 实用操作

| 操作 | 说明 |
|------|------|
| 双击 ESC | 回到上一条输入重新编辑，不用重新手打 |
| `/btw` | 不打断主任务，快速问一个侧问题 |
| `/simplify` | 对刚改完的代码做代码复用、质量和效率三维检查 |
| `/insight` | 让 Claude 分析当前会话，提炼值得沉淀到 CLAUDE.md 的内容 |
| `Ctrl+B` | 长时间运行的 bash 命令移到后台 |

---

## 参考资料

1. [Claude Code 最佳实践](https://code.claude.com/docs/zh-CN/best-practices)
2. [Claude Code 如何工作](https://code.claude.com/docs/zh-CN/how-claude-code-works)
3. [扩展 Claude Code](https://code.claude.com/docs/zh-CN/features-overview)
4. [存储指令和记忆](https://code.claude.com/docs/zh-CN/memory)

---

## 面向未来

- 用一个大约 100 行的 `AGENTS.md` 当目录
- 把设计文档、产品规范、执行计划、技术备忘录、参考材料放进结构化 `docs/`
- 用 linter 和 CI 校验文档是否新鲜、交叉链接是否正确、结构是否正确
- 用 recurring 的 doc-gardening agent 去扫过期文档，再发修复 PR
