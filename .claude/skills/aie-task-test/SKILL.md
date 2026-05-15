---
name: aie-task-test
description: Task 工作流 test 阶段 executor（单 replica）：覆盖成功/失败/回归三类指标，列出测试结果（不出 verdict）
user_invocable: true
---

# aie-task-test

跑测试，覆盖 goal 的三类指标，列出每条结果。**不**出 verdict（verdict 由 `aie-task-plan` 在 plan phase 综合）。test 不走 ensemble（端口 / DB / fixture 共享会互相干扰），单 replica 运行。

## 输入

dispatcher 通过 prompt 注入：
- `iteration` N
- `task_dir`、`repo_root`

读取：
- `<task_dir>/goal.md`（**核心**：成功指标、失败指标、回归范围）
- `<task_dir>/design.md`（若启用）
- `<task_dir>/test-runs/test-*-plan.md`（往轮次 plan）
- 受管工程当前代码状态

## 步骤

1. 把 goal.md 三类指标拆成可执行测试用例：
   - **成功指标** → 在某条件下必须看到 X 行为
   - **失败指标** → 在某条件下必须**不**看到 Y 现象（也是测试，正向描述）
   - **回归范围** → 现有功能 Z 必须仍然 pass
2. 对每条用例选合适方式跑：
   - 优先用工程既有测试框架（jest / pytest / go test / vitest 等）
   - 没有合适用例 → 临时写测试 / 用 CLI 实跑 / 前端任务用浏览器实操
   - 记录每条用例：通过 / 失败 / 未覆盖
3. **不**判定 verdict——把全部结果交给 plan 综合

## 输出

写 `<task_dir>/test-runs/test-<NNN>.md`：

```markdown
---
coverage:
  success: "<pass>/<total>"
  failure: "<pass>/<total>"
  regression: "<pass>/<total>"
failing_cases:
  - "<failing case 1>"
uncovered:
  - "<未能验证的指标 + 原因>"
hint:
  # 给 plan 的提示：失败根因是否疑似在设计层 / review 漏
  suspected_root_cause: "implementation" | "design" | "code-review-missed"
---

# Test Run iter-<N>

## 成功指标
<逐条结果，含跑了什么命令 / 看了什么>

## 失败指标
<逐条结果>

## 回归范围
<逐条结果>

## 未覆盖
<列出未能验证的指标 + 原因>

## 失败根因分析
<对每条失败 case 说明判断为 implementation / design / code-review-missed 的理由>
```

**不**写 progress.txt（plan 统一写）。

## 完成 sentinel（强制）

写 `<task_dir>/.runs/test-<NNN>.json`：

```json
{
  "stage": "test",
  "iteration": <N>,
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

无法完成（测试基础设施起不来、必需 fixture 缺失等）→ `status: "failed"`。注意：测试**用例失败**不是 sentinel.failed——那进 `failing_cases` 由 plan 综合。sentinel.failed 仅指 executor 自身没法跑测试。

## 返回

`test iter-<N>: coverage=<s>/<f>/<r> failing=<count>`

## 关键约束

- **三类指标必须全覆盖**；任一类有未覆盖必须如实写到 `uncovered`
- 真的去**跑**，不只是"代码看起来对"
- **不修代码**
- **不出 verdict**
- **不写 progress.txt**
- `hint.suspected_root_cause` 帮助 plan 判 verdict=revise / backtrack；判错由 plan 综合纠正
