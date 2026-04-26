# AI Excellence - AI 协作契约

## 项目定位

这是一个 AI 协作管控中心，核心职责：**把统一的 AI 协作规范应用到 `projects/` 下的被管工程**。

规范的具体内容写在 `/aie-apply` 命令里（被管工程的 CLAUDE.md 应包含什么、settings.json 应有哪些 hooks、`.claude_global` 软链与 `.gitignore` 条目）。命令负责审查现状、给出 diff、用户确认后合并写入。

## 工作原则

- `projects/` 下的软链工程默认只读，所有改动必须先给 diff 让用户确认
- 本工程自身**不需要** `projects/<initiative>/` 这套结构（那是被管工程的规范），本工程的 `projects/` 只是被管工程的软链入口

## 项目结构

- `projects/` — 被管工程的软链入口
- `.claude/skills/aie-apply.md` — 应用规范的命令实现
- `docs/methodology.md` — 背景方法论（分层原则、上下文管理），不直接驱动命令逻辑
- `.claude_global/` — 含 3 个软链指向 `~/.claude/` 下的配置文件（CLAUDE.md / settings.json / settings.local.json），便利从工程内访问/编辑全局配置；不入 git

## 关键约束

- 全局 Claude 配置真身在 `~/.claude/`，不通过 git 追踪；任意工程内通过 `.claude_global/` 即可读写
- 全局 `CLAUDE.md` 保持极简（只放纯个人偏好）；跨项目通用规范通过 `/aie-apply` 推到各被管工程的项目级 CLAUDE.md
- `/aie-apply` 写入被管工程时必须合并而非覆盖，保留项目原有内容
