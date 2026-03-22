# AI Excellence - AI 协作契约

## 项目定位

这是一个 AI 协作质量管控中心，核心关注：**各项设置是否放对了地方**。

按 docs/methodology.md 的分层原则，判断设置归属是否合理：
- 常驻约束 → CLAUDE.md
- 低频知识 → Skills
- 硬性校验 → Hooks
- 全局通用 → global/（~/.claude/）
- 项目特有 → 项目级配置

"有没有"和"规不规范"是次要的，**"放没放对"才是核心**。

## 工作原则

- `projects/` 下的软链工程只读审查，改动需用户确认
- 所有建议必须基于 `docs/methodology.md` 中的分层方法论

## 项目结构

- `global/` — 全局 Claude 设置（通过软链管理 ~/.claude/ 下的配置文件）
- `projects/` — 软链的受管工程
- `templates/` — 可复用的 CLAUDE.md、hooks、skills 模板
- `.claude/skills/` — 本项目的 Skills（/aie-review）
- `docs/` — 方法论文档

## 关键约束

- 修改 `global/` 下的文件会直接影响全局 Claude 行为（因为是软链的真身）
- 修改前必须告知用户影响范围
- templates/ 是参考模板，不会自动生效
