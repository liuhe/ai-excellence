---
name: aie-task-design
description: Task 工作流 design 阶段 worker（应由 dispatcher 通过 Task() 拉起）：写或修订 design.md
user_invocable: true
---

# aie-task-design

写 / 修订 `design.md`。设计为在 sub-agent fresh context 中由 `aie-task-next` dispatcher 通过 Task() 拉起；也可手动 `/aie-task-design` 调试。

## 输入

- `<task_dir>/goal.md`
- `<task_dir>/progress.txt`（特别是顶部"Codebase Patterns"段）
- `<task_dir>/state.json`（取 `iteration_counters.design`）
- `<task_dir>/design.md`（若已存在 = 修订迭代）
- `<task_dir>/reviews/design-*-plan.md`（若存在 → 读最新一份 plan 的 merged issues = 这次要改的点；**不**读 raw `design-<NNN><r>.md`）
- 受管工程现有相关代码（按 goal 圈定的范围读）

## 步骤

1. 读 goal.md，把握目标 / 成功指标 / 失败指标 / 回归范围
2. 读 progress.txt 顶部 "Codebase Patterns"
3. 判断：
   - 无 design.md → 第一次迭代，从零起草
   - 有 design.md + 无新 review → 已是最终态，跳过（直接返回 "design unchanged"）
   - 有 design.md + 有未消化的最新 review → 按 review.issues 修订
4. design.md 必须覆盖：
   - 方案概述
   - 涉及的现有代码 / 模块
   - 关键设计决策与备选权衡
   - 数据结构 / 接口变更（如有）
   - 对成功指标 / 失败指标 / 回归范围的对应说明（**逐条对账**）
   - 风险与未决问题
5. 覆盖写 `<task_dir>/design.md`
6. 在 `<task_dir>/progress.txt` 末尾追加：
   ```
   ## [<ISO datetime>] design iter-<N>
   - <一两句改了什么 / 关键决策>
   ---
   ```

## 输出

- `<task_dir>/design.md`（必须）
- `<task_dir>/progress.txt` 追加段
- `<task_dir>/.runs/design-<NNN>.json` 完成 sentinel（必须，见下）
- **不写 verdict 文件**（dispatcher 默认 advance 到 design-review）

## 完成 sentinel（强制）

不管成功 / 失败都必须写 `<task_dir>/.runs/design-<NNN>.json`（NNN = 三位补 0 的 iteration）：

```json
{
  "stage": "design",
  "iteration": <N>,
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

无法完成的情况（如必需输入 goal.md 缺失、写 design.md 失败）→ `status: "failed"`。dispatcher 据此判断本轮是否前进。

## 返回

一行总结：`design iter-<N>: <key change>`

## 关键约束

- 严守 goal 范围，不顺手扩大
- 修订迭代只改 review 提到的点 + 必要的连带修改，不重写
- 决策必须显式给"为何不选 X"才算交代清楚
