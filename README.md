# AI Excellence - AI 协作管控中心

## 这是什么

AI Excellence 把统一的 AI 协作规范应用到所有被管工程。

- **应用规范**：用 `/aie-apply` 把统一的工作模式、知识库结构、hooks 推到被管工程
- **理念**：跨项目通用规范应推到各项目的项目级 CLAUDE.md，全局 `~/.claude/CLAUDE.md` 保持极简（只放纯个人偏好）

## 快速开始

### 1. 添加需要管理的工程

将工程软链到 `projects/` 目录：

```bash
ln -s /path/to/your-project projects/your-project
```

### 2. 应用规范到被管工程

```
/aie-apply your-project
```

命令会先审查目标工程的现状，列出缺失或不合规项，给出 diff，确认后合并写入。**不会覆盖项目原有内容**。

## 目录说明

| 目录 | 说明 |
|------|------|
| `projects/` | 被管工程的软链入口 |
| `.claude/skills/aie-apply.md` | `/aie-apply` 命令的实现，规范本身就内嵌在里面 |
| `docs/methodology.md` | 背景方法论 |
| `.claude_global/` | 含 3 个软链 → `~/.claude/{CLAUDE.md,settings.json,settings.local.json}`，本地便利访问，不入 git |

## 全局设置位置

真身在 `~/.claude/`。本工程（以及每个被管工程）通过 `.claude_global/` 提供 3 个软链便利访问，**不通过 git 追踪**全局配置。

## 方法论背景

详见 [docs/methodology.md](docs/methodology.md)。这份文档是分层原则和上下文管理的背景资料，不直接驱动 `/aie-apply` 的逻辑——具体规范以命令内嵌的内容为准。
