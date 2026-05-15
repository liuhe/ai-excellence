---
name: aie-task-implement
description: Task 工作流 implement 阶段 worker：按 design 实现，可读 review/test 反馈做修订
user_invocable: true
---

# aie-task-implement

实现 task。设计为在 sub-agent fresh context 中运行。

## 输入

- `<task_dir>/goal.md`
- `<task_dir>/design.md`（若启用）
- `<task_dir>/progress.txt`（顶部 Codebase Patterns + 学习日志）
- `<task_dir>/state.json`（取 `iteration_counters.implement`）
- `<task_dir>/reviews/code-*-plan.md` 最新一份（若存在 = 这次修订要改的 merged issues；**不**读 raw `code-<NNN><r>.md`）
- `<task_dir>/test-runs/test-*-plan.md` 最新一份（若存在且 verdict ≠ pass = 要修的 bug；**不**读 raw `test-<NNN>.md`）

## 步骤

1. 读 goal / design；若 design 不在 stages_enabled，从 goal 直接推断实现范围
2. 第一次迭代：从零按 design 实现；后续迭代：按最新 review 或 test 反馈**定点改**
3. 每次只做必要改动；不顺手重构、不超出 goal
4. 实现完毕后**实跑**工程的 typecheck / lint / build：
   - 工程惯例命令通常在 `package.json` / `Makefile` / 工程 CLAUDE.md
   - fail → 修到 pass 为止再继续；不能带着失败往下走
   - 不跑功能测试（那是 test 阶段的职责）
5. git commit，message：
   ```
   feat: [<task-slug>] iter-<N> <one-line summary>
   ```
6. 在 `<task_dir>/progress.txt` 末尾追加：
   ```
   ## [<ISO datetime>] implement iter-<N>
   - 改了哪些文件（一行）
   - **学习**：<跨任务可复用的模式 / 坑（无则 "无"）>
   ---
   ```
7. 真正"跨任务"的精炼到 progress.txt 顶部 `## Codebase Patterns` 段（创建该段如不存在）。**分工边界**：implement 只写"实现过程中踩的坑 / 发现的工程模式"；docs 阶段发现的可复用模式由 docs plan 写，两者不交叉

## 输出

- 受管工程代码改动 + 一个新 commit
- progress.txt 追加段（必须）
- `<task_dir>/.runs/implement-<NNN>.json` 完成 sentinel（必须，见下）
- **不写 verdict 文件**（dispatcher 默认 advance 到 code-review）

## 完成 sentinel（强制）

写 `<task_dir>/.runs/implement-<NNN>.json`：

```json
{
  "stage": "implement",
  "iteration": <N>,
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>",
  "commit_sha": "<仅 ok 时填>"
}
```

**status=failed 触发条件**（**不要假装完成**）：
- typecheck / lint / build 反复跑都修不好
- commit 被 pre-commit hook 拒绝且无法解决
- 最新 review 要求的修改与 goal 矛盾，无法两全
- 实现路径上发现根本性障碍（依赖缺失、API 不存在等）

任何上述情况都写 `status: "failed"` + 详细 `fail_reason`，让 dispatcher 走 STUCK 路径让人接手；**不要**为了流畅性硬撑。

## 返回

`implement iter-<N>: <status> [<key files / one-line summary>]`

## 关键约束

- 严格按 goal + design 范围；新发现的问题写进 progress.txt 学习段，不顺手处理
- typecheck / lint / build 必须**实跑**且 pass，不能仅"看起来对"
- commit 必须落地（review 阶段会读 git diff）；commit 失败 → sentinel.failed
- 修不动就 fail，不要硬撑
