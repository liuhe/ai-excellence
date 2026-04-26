# AI Excellence - AI 协作契约

## 项目定位

这是一个 AI 协作管控中心，核心职责：**把统一的 AI 协作规范应用到 `projects/` 下的被管工程，并通过 git 追踪全局配置**。

规范的具体内容写在 `/aie-apply` 命令里（被管工程的 CLAUDE.md 应包含什么、settings.json 应有哪些 hooks）。命令负责审查现状、给出 diff、用户确认后合并写入。

## 工作原则

- `projects/` 下的软链工程默认只读，所有改动必须先给 diff 让用户确认
- 本工程自身**不需要** `projects/<initiative>/` 这套结构（那是被管工程的规范），本工程的 `projects/` 只是被管工程的软链入口

## 项目结构

- `global/` — 全局 Claude 设置真身（`~/.claude/` 下的 CLAUDE.md、settings.json、settings.local.json 都软链到这里）
- `projects/` — 被管工程的软链入口
- `.claude/skills/aie-apply.md` — 应用规范的命令实现
- `docs/methodology.md` — 背景方法论（分层原则、上下文管理），不直接驱动命令逻辑

## 关键约束

- 修改 `global/` 下的文件会直接影响全局 Claude 行为（因为是软链的真身），改前必须告知用户影响范围
- `/aie-apply` 写入被管工程时必须合并而非覆盖，保留项目原有内容
