---
name: aie-task-init
description: 初始化新 task：选 initiative、收集 goal/metrics、约定步骤、写入 task 目录与 state.json
user_invocable: true
---

# /aie-task-init

启动一个新的工作 task。**必须在主会话中交互执行**（不能在 sub-agent 里跑，需跟用户对话）。

## 前置条件（项目模式）

1. cwd 在受管工程的 git 仓库内（`git rev-parse --show-toplevel` 可成功；以下记为 `repo_root`）
2. `<repo_root>/projects/` 目录存在
3. `<repo_root>/projects/` 下至少有一个 initiative 子目录（含 `overview.md`）

不满足则报错并要求先创建 initiative。

**所有路径以 `repo_root` 为绝对锚点**；写入 state.json 的 `task_dir` 用相对路径（`projects/<initiative>/tasks/<slug>`），便于仓库迁移。

## 步骤

### 1. 确定 initiative

列出 `projects/*/overview.md` 存在的 initiative，让用户选。如用户消息已点名某 initiative，直接用。

### 2. 收集 goal（5 项必问）

逐项与用户对话收集；每项空泛（如"提升性能"）必须追问到可验证：

- **背景** background：触发本任务的上下文
- **目标** goal：要达成什么
- **成功指标** success metrics：怎么判定完成（必须可验证）
- **失败指标** failure metrics：哪些迹象说明做坏了
- **回归范围** regression scope：必须保证仍然可用的现有功能 / 行为

### 3. 生成 task slug 与目录

slug：kebab-case，从 goal 提炼 2–4 个英文词；与用户确认。

```
projects/<initiative>/tasks/<slug>/
```

不存在则创建；已存在则报错（不覆盖、不复用）。

### 4. 写 goal.md

```markdown
# Task: <title>

**Initiative**: <initiative>
**Slug**: <slug>
**Created**: <ISO datetime>

## 背景
<background>

## 目标
<goal>

## 成功指标
- <metric 1>
- ...

## 失败指标
- <metric 1>
- ...

## 回归范围
- <scope 1>
- ...
```

### 5. 约定执行步骤

跟用户确认要启用哪些阶段。默认全启：

- `design`（写设计文档）
- `design-review`（ensemble × 2，单轮即决 verdict）
- `implement`（实现）
- `code-review`（ensemble × 2，单轮即决 verdict）
- `test`（单 executor，plan 综合三类指标即决 verdict）
- `docs`（单 executor，连续 2 次"无新建议"才前进）

每个有 verdict 的阶段（design-review / code-review / test / docs）由两个 phase 组成：**exec** 跑观察、**plan** 综合判 verdict（参见 `.claude/skills/aie-task-plan/SKILL.md`）。

简单任务可以禁用 `design` + `design-review`（这两个必须**配对**启用 / 禁用——单独留 design-review 没意义）。把默认列表给用户看，问"是否调整"，按答复确定 `stages_enabled`。

**强制约束**：`stages_enabled` 必须保留 `implement` + `code-review` + `test` + `docs` 这 4 项。design 与 design-review 可整对禁用。

### 6. 写 progress.txt

```
# Task: <title>
Started: <ISO datetime>
Initiative: <initiative>

## 启用步骤
<list>

## 计划
<跟用户讨论后的初步思路，2-5 行>

## Codebase Patterns
（按需在迭代中追加。仅放跨任务可复用的规律。）

---

## 学习日志
（每次 worker 工作后追加 `## [<ISO datetime>] <stage> iter-<N>` 段）
```

### 7. 写 state.json

```json
{
  "task_slug": "<slug>",
  "initiative": "<initiative>",
  "task_dir": "projects/<initiative>/tasks/<slug>",
  "stages_enabled": ["design","design-review","implement","code-review","test","docs"],
  "stage": "<stages_enabled[0]>",
  "phase": "exec",
  "consecutive_pass": {"docs": 0},
  "iteration_counters": {"design": 0, "design-review": 0, "implement": 0, "code-review": 0, "test": 0, "docs": 0},
  "backtrack_history": [],
  "failure_log": [],
  "stuck_threshold": 3,
  "started_at": "<ISO datetime>",
  "updated_at": "<ISO datetime>"
}
```

- `phase`: `"exec"` 或 `"plan"`，由 dispatcher 维护；init 总是 `"exec"`
- `consecutive_pass`: 只保留 `docs`（其它有 verdict 阶段单轮即决，不再用连胜计数）
- `iteration_counters` 只列 `stages_enabled` 中的项
- `failure_log` 记 exec / plan 任一 phase 异常退出（无 sentinel 或 sentinel.failed）；同一 stage（任一 phase）累计 ≥ 2 次 dispatcher 立即 STUCK
- `stuck_threshold = 3` 控制 backtrack_history 中 (from,to) 重复阈值

### 8. 同步 tasks.md（如已存在）

若 `projects/<initiative>/tasks.md` 存在，末尾追加一行索引：

```
🚀 <title> — see tasks/<slug>/
```

不存在不主动创建。

### 9. 提示用户下一步

```
Task 已初始化：projects/<initiative>/tasks/<slug>/
启动自治循环：
  /loop /aie-task-next
或单步推进：
  /aie-task-next
```

## 关键约束

- 全程交互，不假设答案
- 不开始任何实现工作（init 只搭骨架）
- goal 五项缺一不可；任一项过空必须追问
- 路径计算用 cwd 相对路径；不写绝对路径到文件中（保持仓库可迁移）
