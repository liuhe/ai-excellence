---
name: aie-task-docs
description: Task 工作流 docs 阶段 executor（单 replica）：扫描三级文档候选建议（不出 verdict、不写副作用）
user_invocable: true
---

# aie-task-docs

扫描本任务过程中产生的可沉淀知识，**穷举式**列出三级（task / project / engineering）候选建议。**不**出 verdict、**不**写 progress.txt、**不**改 docs-update-suggestions.md——这些由 `aie-task-plan` 在 plan phase 综合 + 收口。

## 输入

dispatcher 通过 prompt 注入：
- `iteration` N
- `task_dir`、`repo_root`

读取：
- `<task_dir>/goal.md`、`design.md`、`progress.txt`、`reviews/`、`test-runs/`
- `<task_dir>/docs-rounds/docs-*-plan.md`（往轮次 plan，避免重复挑同样建议）
- 受管工程：根 `CLAUDE.md`、`AGENTS.md`、`projects/<initiative>/CLAUDE.md`（如有）、`projects/<initiative>/log.md`、相关 `.claude/skills/`、`docs/`

## 三级文档范围

| 级别 | 应放什么 |
|---|---|
| **Task** | 任务过程中**重复出现**的小模式（仅在本任务内可复用） |
| **Project** | 仅本 initiative 复用的知识 / 决策 / 踩坑 |
| **Engineering** | 跨 initiative 复用的工程级规律 |

## 步骤

1. 扫描全部任务产物（goal、design、progress、reviews、test-runs、git diff）
2. 识别**可沉淀**的内容
   - 判断标准：**未来其他工作是否会复用**？只对当前任务有意义的不沉淀
3. 把每条候选归到三个级别之一，标注理由
4. 读 `<task_dir>/docs-rounds/docs-*-plan.md`：
   - 已被前轮 plan 处理过的同类建议不重复罗列
   - 仅列**本轮新增 / 修订**
5. **不**判定收敛（无新 = 0 / >0 的判断由 plan 综合，因为只有 plan 跨轮视角能去重）

## 输出

写 `<task_dir>/docs-rounds/docs-<NNN>.md`：

```markdown
---
candidates:
  task: <count>
  project: <count>
  engineering: <count>
---

# Docs Observation iter-<N>

## Task 级候选
- **<pattern 1>** — 理由：<跨任务复用方向>
- ...

## Project 级候选
### 目标文件：`projects/<initiative>/CLAUDE.md`
- 内容：<具体追加 / 修改文字>
- 理由：<...>

### 目标文件：`projects/<initiative>/log.md`
- ...

## Engineering 级候选
### 目标文件：`<repo>/CLAUDE.md`
- ...

### 目标文件：`<repo>/AGENTS.md`
- ...
```

**不**写 progress.txt。**不**改 `<task_dir>/docs-update-suggestions.md`（plan 维护）。**不**写任何受管工程文件。

## 完成 sentinel（强制）

写 `<task_dir>/.runs/docs-<NNN>.json`：

```json
{
  "stage": "docs",
  "iteration": <N>,
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

无法读输入 / 无法写候选文件 → `status: "failed"`。

## 返回

`docs iter-<N>: candidates t=<count> p=<count> e=<count>`

## 关键约束

- **task 级**也只列候选，不直接改 progress.txt（由 plan 写）
- **project / engineering 级**严禁直接改受管工程文件
- 不假定"新建议为 0 == 可收敛"——由 plan 跨轮比对
- 不读其他 round 的 raw docs-<NNN>.md（只读 plan 输出）
