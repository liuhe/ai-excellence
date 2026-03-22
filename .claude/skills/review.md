---
name: review
description: 审查项目的 AI 协作配置，给出评分和改进建议
user_invocable: true
---

# /review [项目名]

审查项目的 AI 协作配置状态，基于 docs/methodology.md 方法论给出评分和建议。

## 行为

- 无参数：遍历 `projects/` 下所有软链工程，输出汇总报告
- 有参数：深入审查指定项目，给出详细建议

## 审查维度

按 Claude Code 六层架构逐层检查：

### 1. 常驻契约层
- [ ] CLAUDE.md 是否存在？内容是否有效？
- [ ] 是否有项目级 `.claude/settings.local.json`？权限配置是否合理？
- [ ] Memory 目录状态

### 2. 工作流层
- [ ] 是否有自定义 Skills（`.claude/skills/`）？
- [ ] Skills 是否有清晰的 description 和触发条件？

### 3. 动作层
- [ ] 是否配置了 MCP servers？
- [ ] 工具权限是否合理（不过度开放）？

### 4. 控制层
- [ ] 是否配置了 Hooks？
- [ ] 是否有必要的校验（如 pre-commit、lint）？

### 5. 上下文管理
- [ ] CLAUDE.md 行数是否合理（建议 < 100 行常驻）？
- [ ] 是否有 Compact Instructions？
- [ ] 低频知识是否已拆分到 Skills？

### 6. 文档
- [ ] 是否有 README-AIE.md？
- [ ] 文档是否与实际配置一致？

## 执行步骤

1. 读取 `docs/methodology.md` 作为评估标准
2. 确定要审查的项目范围
3. 对每个项目，逐层检查上述维度
4. 用表格输出汇总结果（维度 | 状态 | 建议）
5. 给出优先级排序的改进建议

## 输出格式

### 汇总模式（无参数）

```
| 项目 | 契约层 | 工作流层 | 动作层 | 控制层 | 上下文 | 文档 | 总评 |
```

### 详细模式（指定项目）

逐层输出检查结果和具体改进建议，按优先级排序。
