---
name: aie-task-next
description: Task 工作流 dispatcher：读 state.json，按 phase 拉起 executor / plan，应用 verdict 推进或回溯
user_invocable: true
---

# /aie-task-next

任务工作流的状态机驱动器。**每次调用执行一轮**：根据 `(stage, phase)` 拉起对应 sub-agent，整理结果，更新状态。

每个 stage 分两个 **phase**（`state.phase` 字段，值为 `"exec"` 或 `"plan"`）：

- **exec phase**：executor sub-agent（design-review / code-review 走 ensemble × 2，并行 spawn；test / docs / design / implement 单 spawn）
- **plan phase**：plan sub-agent（仅有 verdict 的 stage 才有 plan phase；判定 verdict + 收口副作用）

> **术语约定**：本文档中 "phase" 一词**专指** `state.phase` 这个状态机字段（`"exec"` / `"plan"`），不再用于泛指 stage 或流程阶段。泛指流程阶段时统一用 "stage"。

**关键**：当一个 stage 的 exec phase 成功时，本次 firing **同一上下文中继续**直接 spawn plan、读 verdict、更新 state，**不**走 ScheduleWakeup。每次 firing 只在所有 phase 都跑完且要前进到下一个 stage 时才在末尾 ScheduleWakeup（避免 60s 等待被 phase 切分放大）。

## 运行方式

- `/loop /aie-task-next [<slug>]` —— 推荐。dispatcher 在每轮末尾会**主动尝试** `ScheduleWakeup` 续 firing；调用失败（不在 /loop 模式下）则忽略。
- `/aie-task-next [<slug>]` —— 单步调试。

## 参数

可选 `<task-slug>`。否则按定位规则自动找。

## 步骤

### 0. repo_root

```
repo_root = $(git rev-parse --show-toplevel)
```

不在 git 仓库中 → 报错。所有路径绝对化：`abs_task_dir = repo_root + "/" + state.task_dir`。

### 1. 定位 task

1. 命令参数显式 slug → `projects/*/tasks/<slug>/`
2. cwd 在 `<repo_root>/projects/*/tasks/*/` 下 → 用 cwd
3. 扫所有 `state.json`，仅一个 `stage != "done"` → 自动用
4. 多个未完成 → 列出 + 要求指定

### 2. 读 state.json

不存在 → 报错并提示 `/aie-task-init`。

**旧版兼容**：早期 init 的 state.json 可能缺少字段，读取时按以下默认值补全（不回写，仅内存）：
- 缺 `phase` → 默认 `"exec"`
- `consecutive_pass` 含多余键（非 `docs`）→ 忽略多余键，仅读 `docs`
- 缺 `failure_log` → 默认 `[]`
- 缺 `backtrack_history` → 默认 `[]`

### 3. 终止条件

- `state.stage == "done"` → `<promise>COMPLETE</promise>`，**不**调度续 firing
- `backtrack_history` 中任一 `(from, to)` 出现 ≥ `stuck_threshold` → `<promise>STUCK</promise>`
- `failure_log` 中任一 stage 累计 ≥ 2 → `<promise>STUCK</promise>`

### 4. 决定本轮要跑哪个 phase

设 `S = state.stage`、`phase = state.phase`（默认 `"exec"`）。

| S 是否有 verdict？ | 是否 ensemble？ | exec phase | plan phase |
|---|---|---|---|
| design | 否 | 单 executor | （无） |
| implement | 否 | 单 executor | （无） |
| design-review | 是 | ensemble × 2 | 有 |
| code-review | 是 | ensemble × 2 | 有 |
| test | 是 | 单 executor | 有 |
| docs | 是 | 单 executor | 有 |

ensemble = `S ∈ {"design-review", "code-review"}`。

### 5. EXEC PHASE

仅当 `phase == "exec"` 时执行。

#### 5.1 自增 iter

`N = state.iteration_counters[S] + 1`。**先**写回 state.json（预占），再 spawn。失败的 N 永久作废，文件号会有 gap。

#### 5.2 spawn executor

**ensemble**（design-review / code-review）— 在**同一个消息**里发 2 个 Task() 并行：

```
Task A:
  description: aie-task-<S> iter-<N> replica-a
  subagent_type: general-purpose
  prompt: |
    你是 <S> executor（fresh ctx），replica = a。
    repo_root: <repo_root>
    task_dir:  <abs_task_dir>
    iteration: <N>
    replica:   a

    1. cd <repo_root>
    2. 读 <repo_root>/.claude/skills/aie-task-<S>/SKILL.md
    3. 严格按其执行；输出文件名加 a 后缀（如 reviews/<S 简写>-<NNN>a.md）
    4. sentinel 写到 <task_dir>/.runs/<S>-<NNN>a.json
    5. 返回单行：<S> iter-<N>a: <status>

Task B: 同上，replica = b，文件名后缀 b
```

**单 executor**（test / docs / design / implement）— 一个 Task()：

```
description: aie-task-<S> iter-<N>
subagent_type: general-purpose
prompt: |
  你是 <S> executor（fresh ctx）。
  repo_root: <repo_root>
  task_dir:  <abs_task_dir>
  iteration: <N>

  1. cd <repo_root>
  2. 读 <repo_root>/.claude/skills/aie-task-<S>/SKILL.md
  3. 严格执行；输出文件名 <S 简写>-<NNN>.md（无后缀）
  4. sentinel 写到 <task_dir>/.runs/<S>-<NNN>.json
  5. 返回单行：<S> iter-<N>: <status>
```

#### 5.3 检查 executor sentinel

- ensemble：读 `.runs/<S>-<NNN>a.json` + `.runs/<S>-<NNN>b.json`
  - 任一缺失或 `status == "failed"` → 本 iter 失败
  - `failure_log.push({stage:S, iter:N, phase:"exec", ts:<now>, reason:<合并 fail_reason 或 "no sentinel">})` —— **仅计 1 次**（不是 2 次，避免熔断阈值被并发放大）
  - 不前进；保持 `phase == "exec"`；回到第 3 步检查 stuck，未达则结束本轮 firing 并 ScheduleWakeup（下次重试新 N）
- 单 executor：读 `.runs/<S>-<NNN>.json`
  - 缺失或 failed → 同样 failure_log，不前进

#### 5.4 exec ok 后

- 若 S **无 verdict**（design / implement）：直接进入第 7 步状态转移（advance）；**跳过 plan phase**
- 若 S **有 verdict**：`state.phase = "plan"` 写回；**同一次 firing 内**继续第 6 步（**不** ScheduleWakeup）

### 6. PLAN PHASE

仅当 `phase == "plan"` 时执行。

#### 6.1 spawn plan

```
description: aie-task-plan <S> iter-<N>
subagent_type: general-purpose
prompt: |
  你是 task 工作流 plan worker（fresh ctx）。
  repo_root: <repo_root>
  task_dir:  <abs_task_dir>
  stage:     <S>
  iteration: <N>

  1. cd <repo_root>
  2. 读 <repo_root>/.claude/skills/aie-task-plan/SKILL.md
  3. 严格执行；plan 输出文件名 <S 简写>-<NNN>-plan.md
  4. sentinel 写到 <task_dir>/.runs/plan-<S>-<NNN>.json
  5. 返回单行：plan-<S> iter-<N>: verdict=<V>
```

**spawn 本身异常**（Task tool 抛错、网络中断等）：视同 sentinel 缺失，走 6.2 的失败路径（failure_log + ScheduleWakeup 重试）。

#### 6.2 检查 plan sentinel

读 `.runs/plan-<S>-<NNN>.json`（期望格式：`{stage:S, phase:"plan", iteration:N, status:...}`，与 failure_log 同构）：

- 缺失 / failed → `failure_log.push({stage:S, iter:N, phase:"plan", reason:...})`，**不前进**，保持 `phase == "plan"`，结束本轮 firing 并 ScheduleWakeup
- ok → 读 plan 输出文件 frontmatter 拿 verdict，进入第 7 步

verdict 文件应存在；plan sentinel.ok 但 plan 输出缺失 verdict → plan 协议违规 → 视为 failure。

### 7. 应用 verdict / 推进 state

next(S) = `stages_enabled` 中 S 之后第一个；末尾后 = `"done"`。

| 当前 S | verdict | 动作 |
|---|---|---|
| design | (none) | `stage = next(S)`，`phase = "exec"` |
| implement | (none) | `stage = next(S)`，`phase = "exec"` |
| design-review | pass | `stage = next(S)`，`phase = "exec"` |
| design-review | revise | `stage = "design"`，`phase = "exec"` |
| code-review | pass | `stage = next(S)`，`phase = "exec"` |
| code-review | revise | `stage = "implement"`，`phase = "exec"` |
| code-review | backtrack(design) | `stage = "design"`，`phase = "exec"`，记 `backtrack_history` |
| test | pass | `stage = next(S)`，`phase = "exec"` |
| test | revise | `stage = "implement"`，`phase = "exec"` |
| test | backtrack(design \| code-review) | 回溯到目标 stage，`phase = "exec"`，记 `backtrack_history` |
| docs | pass | `consecutive_pass["docs"]++`；≥ 2 → `stage = "done"`，重置；< 2 → 保持 `stage = "docs"`，`phase = "exec"` |
| docs | revise | `consecutive_pass["docs"] = 0`，保持 `stage = "docs"`，`phase = "exec"` |

**docs 特殊**：单 executor + 仍要求"连续 2 次新增 = 0"才收敛（双保险）。design-review / code-review / test 不再 consecutive_pass——ensemble 单轮即决（test 由 plan 综合三类指标决）。

回溯时：清零 `consecutive_pass["docs"]`（避免假收敛），记 `backtrack_history.push({from:S, to:T, iter:N, ts:<now>})`。**backtrack-to 不在 stages_enabled** → 降级到 stages_enabled 中"最近的、位于当前 stage 之前的生成型阶段"（design / implement），按 revise 语义。

### 8. 完成时同步 tasks.md

若 `stage` 转 `"done"` 且 `<repo_root>/projects/<initiative>/tasks.md` 存在：把含 `tasks/<slug>/` 那一行的 `🚀` 替换为 `✅`。

### 9. 写回 + 输出 + 续 firing

```
state.updated_at = <now>
write state.json
```

输出：
```
[aie-task] <slug> iter=<N> stage=<S>/<phase> → <next-S>/<next-phase> verdict=<V> failures=<count>
```

终止信号：
- `stage == "done"` → `<promise>COMPLETE</promise>`，**不**调用 ScheduleWakeup
- stuck → `<promise>STUCK</promise>`，**不**调用 ScheduleWakeup
- 其余 → **尝试** `ScheduleWakeup(prompt="/loop /aie-task-next <slug>", delaySeconds=60, reason="aie-task <slug> stage=<next-S>/<next-phase>")`（runtime 钳到 [60, 3600]）

## 关键约束

- 一次 firing 内若 exec 成功且 stage 有 plan phase，**必须紧接着同上下文 spawn plan**，不分两次 firing（这是化解 60s ×2 的关键）
- ensemble 两个 executor **必须并行 spawn**（一条消息发两个 Task），不要串行
- worker / plan 都通过 Task() spawn（fresh ctx），主会话不直接执行
- state.json 每次写入更新 `updated_at`
- iter 在 exec spawn 前预占，失败 N 不重用（gap 是 feature）
- sentinel = 完成性；verdict = 业务结论；plan 输出 frontmatter 是 verdict 唯一来源
- ensemble exec 任一 replica fail → 计 1 次失败（不放大）
- backtrack 一定清零相关 consecutive_pass
- 同 stage（任一 phase）累计失败 ≥ 2 立即 STUCK
- **worker timeout**：Task() spawn 不指定显式超时，依赖 Task tool 自身默认超时。如 worker hang 住导致无 sentinel，走正常 failure 路径
- **文件名 glob 注意**：ensemble 输出 `<S>-<NNN>a.md` / `<S>-<NNN>b.md` 与 plan 输出 `<S>-<NNN>-plan.md` 共享前缀。用 glob `<S>-<NNN>*` 会同时匹配三个文件。精确匹配时请用完整后缀（`a.md` / `b.md` / `-plan.md`）
