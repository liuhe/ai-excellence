---
name: aie-task-design-review
description: Task 工作流 design-review 阶段 executor（ensemble × 2 中的一个 replica）：审 design.md，输出观察 issues（不出 verdict）
user_invocable: true
---

# aie-task-design-review

审 `design.md`，列出问题；**不**出 verdict（verdict 由 `aie-task-plan` 在 plan phase 综合）。本 skill 在 ensemble × 2 中作为单个 replica 运行；dispatcher 会同时拉起 replica a 与 b，分别独立审。

## 输入

dispatcher 通过 prompt 注入：
- `replica`: `"a"` 或 `"b"`（决定输出文件后缀）
- `iteration` N
- `task_dir`、`repo_root`

读取：
- `<task_dir>/goal.md`
- `<task_dir>/design.md`
- `<task_dir>/reviews/design-*-plan.md`（往轮次 plan 输出，避免重复挑前轮已稳定的问题）
- 受管工程相关代码（design 涉及到的文件）

**不读** `reviews/design-<*>a.md` / `b.md`（即另一 replica 的本轮观察），保证独立性。

## 步骤

1. 把 design.md 与 goal.md 三类指标（成功 / 失败 / 回归）逐项对照
2. 检查清单：
   - 方案能否达成**全部**成功指标
   - 失败指标是否被识别 / 防御
   - 回归范围内的功能会不会被破坏
   - 关键决策是否合理排除了备选
   - 对现有代码的假设是否正确（**必要时实际读源码核实**，不要靠脑补）
   - 是否存在被忽略的边界 / 异常 / 并发情况
3. 不要重复挑前轮 plan 已经讨论过的同一类问题（除非确认前轮修订没真改）
4. 把发现写成 issues 清单——**不**判定 verdict

## 输出

写 `<task_dir>/reviews/design-<NNN><r>.md`（`<r>` = `a` 或 `b`）：

```markdown
---
replica: a | b
issues:
  - "<issue 1>"
  - "<issue 2>"
---

# Design Review iter-<N> replica <r>

## 与成功指标对账
<逐条>

## 与失败指标对账
<逐条>

## 与回归范围对账
<逐条>

## 其它发现
<...>
```

发现的问题没有按"严重性=design 骨架错"标记的必要（plan phase 综合判定）。但发现确属设计骨架错的，issue 文字里写明"骨架/设计层"以方便 plan 判 backtrack。

**不**写 progress.txt（plan 统一写）。

## 完成 sentinel（强制）

写 `<task_dir>/.runs/design-review-<NNN><r>.json`：

```json
{
  "stage": "design-review",
  "iteration": <N>,
  "replica": "a" | "b",
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

无法完成（design.md 不存在、读不到等）→ `status: "failed"`。

## 返回

`design-review iter-<N><r>: issues=<count>`

## 关键约束

- **不修改 design.md**
- **不出 verdict**；不写 `verdict:` 字段
- **不写 progress.txt**
- 不读另一 replica 本轮输出（保 ensemble 独立性）
- 必要时读源码核实假设，不凭 design 描述空想
