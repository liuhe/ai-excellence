# AI Excellence - AI 协作契约

## 项目定位

这是一个 AI 协作管控中心，核心职责：**把统一的 AI 协作规范应用到 `receivers/` 下的被管工程**。

规范的具体内容写在 `/aie-apply` 命令里（被管工程的 CLAUDE.md 应包含什么、settings.json 应有哪些 hooks、`.claude_global` 软链与 `.gitignore` 条目）。命令负责审查现状、给出 diff、用户确认后合并写入。

## 工作原则

- `receivers/` 下的软链受管工程默认只读，所有改动必须先给 diff 让用户确认
- 本工程自身**不需要** `projects/<initiative>/` 这套结构（那是被管工程内部的规范）

## 目录职责

- **`receivers/`** —— 受管工程软链入口。每个子项都是软链，指向本机他处的真身仓库。本工程对其只做规范应用（`/aie-apply` 等），不修改代码。**不入 git**。
- **`projects/`** —— **本工程自身的 initiative 容器**，跟被管工程 CLAUDE.md 里定义的项目模式一致：每个 `projects/<name>/` 含 `overview.md` / `tasks.md` / `log.md`（可选 `design.md`），追踪本工程正在推进的某项工作。**入 git**。
- **能力模块顶级目录**（例如 `methodology/`、`ai-observation/`）—— 本工程孵化的独立能力源码，跟 `projects/` 分开：源码放模块目录里，进展/任务/决策放对应的 `projects/<name>/` initiative dir 里。

## 对话焦点维护

跑偏不按节奏发生，所以按信号触发而非定期总结。出现以下任一信号时，先用 ≤3 行复述"当前讨论焦点 + 已排除方向"，确认后再继续：

- 用户发出纠偏语（"不是这个" / "抓住重点" / "我想谈的是…"），或连续两轮追问同一个点
- 准备引入新话题、新机制，或上一轮回答被用户缩窄了范围

## 项目结构

- `receivers/` — 受管工程软链入口（见上方"目录职责"）
- `projects/` — 本工程 initiative 容器（每个 `projects/<name>/` 是一个正在推进的项目跟踪，含 overview/tasks/log）
- `methodology/`, `ai-observation/`, … — 能力模块源码（跟对应 `projects/<name>/` initiative 呼应）
- `.claude/skills/aie-apply.md` — 应用规范的命令实现
- `.claude/settings.json` — 本工程自己的 hook 注册（含 `ai-observation/hook.sh` 采集 hooks，因为 ai-excellence 是它的首个 dogfood 目标）
- `.aie/` — 本工程作为 target 项目的观察数据（gitignored）
- `docs/methodology.md` — 背景方法论（分层原则、上下文管理），不直接驱动命令逻辑
- `.claude_global/` — 含 3 个软链指向 `~/.claude/` 下的配置文件（CLAUDE.md / settings.json / settings.local.json），便利从工程内访问/编辑全局配置；不入 git

## 关键约束

- 全局 Claude 配置真身在 `~/.claude/`，不通过 git 追踪；任意工程内通过 `.claude_global/` 即可读写
- 全局 `CLAUDE.md` 保持极简（只放纯个人偏好）；跨项目通用规范通过 `/aie-apply` 推到各被管工程的项目级 CLAUDE.md
- `/aie-apply` 写入被管工程时必须合并而非覆盖，保留项目原有内容
