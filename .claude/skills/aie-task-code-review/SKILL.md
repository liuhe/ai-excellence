---
name: aie-task-code-review
description: Task 工作流 code-review 阶段 executor（ensemble × 2 中的一个 replica）：审实现的代码改动，列 issues + 静态检查结果（不出 verdict）
user_invocable: true
---

# aie-task-code-review

review 当前任务的代码改动，输出观察 issues；**不**出 verdict（verdict 由 `aie-task-plan` 在 plan phase 综合）。本 skill 在 ensemble × 2 中作为单 replica 运行。

## 输入

dispatcher 通过 prompt 注入：
- `replica`: `"a"` 或 `"b"`
- `iteration` N
- `task_dir`、`repo_root`

读取：
- `<task_dir>/goal.md`
- `<task_dir>/design.md`（若启用；**不存在时 fallback**：跳过 design 对账，仅按 goal 审查）
- `<task_dir>/reviews/code-*-plan.md`（往轮次 plan）
- 受管工程的代码改动：本任务范围内的 commits（含 `[<task-slug>]` 标签）

**不读**另一 replica 的本轮观察。

## 步骤

1. 拉到本任务相关的所有改动：
   ```
   git log --oneline --grep="\[<task-slug>\]"
   git diff <first task commit>^..HEAD -- <relevant paths>
   ```
2. 检查清单：
   - 实现是否覆盖 design 全部决策（逐条对账；**无 design.md 时跳过此项**，改为按 goal 逐条验证实现完整性）
   - 命名 / 结构 / 错误处理是否符合工程既有风格（参考工程 CLAUDE.md / AGENTS.md）
   - 有无超出 goal 的越界改动
   - 边界情况、异常分支、并发、安全是否处理
   - typecheck / lint / build 是否真过——**实跑一遍**，不只信 commit message
   - 单元 / 类型 / 静态层测试覆盖是否合理（功能测试是 test 阶段的事）
3. 不重复前轮 plan 已经讨论过的同类问题
4. 列 issues。**不**判定 verdict。骨架错（设计层）请在 issue 文字里写明"设计层"以方便 plan 判 backtrack。

## 输出

写 `<task_dir>/reviews/code-<NNN><r>.md`：

```markdown
---
replica: a | b
issues:
  - "<issue 1>"
static_checks:
  typecheck: "pass" | "fail" | "n/a"
  lint:      "pass" | "fail" | "n/a"
  build:     "pass" | "fail" | "n/a"
---

# Code Review iter-<N> replica <r>

## 与 design 对账
<逐条决策映射到 commit/文件，标 ✓ 或 ✗>

## 静态质量
<typecheck / lint / build 实跑输出摘要>

## 风格 / 越界检查
<...>

## 边界 / 异常
<...>
```

**不**写 progress.txt。

## 完成 sentinel（强制）

写 `<task_dir>/.runs/code-review-<NNN><r>.json`：

```json
{
  "stage": "code-review",
  "iteration": <N>,
  "replica": "a" | "b",
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

找不到本任务相关 commit / git 状态异常 / 必要工具缺失 → `status: "failed"`。

## 返回

`code-review iter-<N><r>: issues=<count>`

## 关键约束

- **不修改代码**
- **不出 verdict**
- **不写 progress.txt**
- 不读另一 replica 本轮输出
- typecheck / lint / build **必须实跑**，看输出，不只看 commit message
