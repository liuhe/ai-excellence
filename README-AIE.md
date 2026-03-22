# AI Excellence - AI 使用指南

## 这是什么

AI Excellence 是一个集中管理所有项目 AI 协作配置的工程。通过它你可以：

- 统一查看和管理所有项目的 AI 设置（CLAUDE.md、hooks、skills、权限等）
- 管理全局 Claude 配置（settings.json、全局 CLAUDE.md）
- 使用模板快速为新项目建立 AI 协作规范

## 快速开始

### 1. 添加需要管理的项目

将你的工程软链到 `projects/` 目录下：

```bash
ln -s /path/to/your-project projects/your-project
```

### 2. 审查项目 AI 配置

在本工程的 Claude Code 中使用：

```
/review              # 审查所有项目
/review your-project # 审查单个项目
```

### 3. 应用最佳实践模板

```
/apply-template your-project
```

## 目录说明

| 目录 | 说明 |
|------|------|
| `global/` | 全局 Claude 设置，通过软链管理 `~/.claude/` 下的配置 |
| `projects/` | 软链的受管工程 |
| `templates/` | CLAUDE.md、hooks、skills 等模板 |
| `docs/` | AI 协作方法论 |

## 全局设置管理

`global/` 目录中的文件是 `~/.claude/` 下对应文件的真身（通过软链关联）。
修改这些文件等同于修改全局 Claude 配置，变更会被 git 记录。

## 方法论

详见 [docs/methodology.md](docs/methodology.md)，核心思路：

1. **分层管理上下文**：常驻约束放 CLAUDE.md，低频知识放 Skills，硬性校验放 Hooks，大体量探索放 Subagents
2. **主动管理上下文开销**：关注 token 消耗，避免上下文膨胀
3. **验证优先**：写好 Prompt 后，"验证"应该放在第一位
