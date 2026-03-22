---
name: apply-template
description: 将最佳实践模板应用到指定项目
user_invocable: true
---

# /apply-template <项目名>

将 `templates/` 中的最佳实践模板交互式地应用到指定项目。

## 行为

1. 确认目标项目存在于 `projects/` 下
2. 检查目标项目当前的 AI 配置状态
3. 对比 templates/ 中的模板，列出缺失项
4. 逐项询问用户是否要应用，按需定制内容后写入目标项目

## 可应用的模板

| 模板 | 目标位置 | 说明 |
|------|----------|------|
| `CLAUDE.md.example` | 项目根目录 `CLAUDE.md` | AI 协作契约 |
| `README-AIE.md.example` | 项目根目录 `README-AIE.md` | AI 使用指南 |
| `hooks/` | `.claude/settings.local.json` | hooks 配置 |
| `skills/` | `.claude/skills/` | 自定义 skills |

## 执行步骤

1. 读取目标项目路径：`projects/<项目名>/`
2. 扫描项目现有 AI 配置
3. 对比模板，列出差异
4. 对每个缺失项：
   - 展示模板内容
   - 询问用户是否应用、是否需要定制
   - 用户确认后写入
5. 汇总已应用的变更

## 约束

- 不覆盖已存在的文件，除非用户明确要求
- 每个变更都需要用户确认
- 写入后提示用户检查结果
