---
name: aie-task-plan
description: Task 工作流 plan 阶段 worker：合并 executor 观察 + 历史 → 出 verdict + 收口副作用
user_invocable: true
---

# aie-task-plan

判断 / 合并器。对**有 verdict 的阶段**（design-review / code-review / test / docs），由 dispatcher 在 exec phase 完成后**紧接着**在同一次 firing 内拉起（不走 ScheduleWakeup）。

负责两件事：
1. 综合本轮 executor 观察（1 或 2 份），结合往轮次历史 + goal，**判 verdict**
2. **收口副作用**：progress.txt 追加、docs 的 Codebase Patterns 与 docs-update-suggestions.md 维护

executor 不再写 verdict、不再读历史、不再触 progress.txt。

## 输入

dispatcher 通过 prompt 注入：
- `stage`: `design-review` | `code-review` | `test` | `docs`
- `task_dir`、`repo_root`、`iteration` N

**exec_files 自推**（不依赖 dispatcher 传入）：根据 `stage` + `iteration` 按命名约定定位——ensemble 阶段读 `<dir>/<S 简写>-<NNN>a.md` + `<S 简写>-<NNN>b.md`，单 executor 阶段读 `<dir>/<S 简写>-<NNN>.md`。

按 stage 区分读取：

| stage | exec 观察 | 历史 | 上下文 |
|---|---|---|---|
| design-review | `reviews/design-<NNN>a.md` + `b.md` | `reviews/design-*-plan.md` | `goal.md`, `design.md` |
| code-review   | `reviews/code-<NNN>a.md` + `b.md` | `reviews/code-*-plan.md` | `goal.md`, `design.md`（不存在则仅用 goal）, git diff |
| test          | `test-runs/test-<NNN>.md` | `test-runs/test-*-plan.md` | `goal.md`（三类指标） |
| docs          | `docs-rounds/docs-<NNN>.md` | `docs-rounds/docs-*-plan.md`, `docs-update-suggestions.md` | `goal.md`, `progress.txt`, 受管工程 CLAUDE.md / `projects/<init>/` |

## 步骤

### 1. 读 executor 观察 + 历史

- ensemble 阶段任一份缺失 → sentinel.failed
- 单 executor 阶段观察缺失 → sentinel.failed
- 历史为空（首轮）正常

### 2. 综合判 verdict

| stage | 判定规则 |
|---|---|
| **design-review** | 取两份 issues 并集，去重；去掉已被前轮 plan 处理过仍重复挑的（除非确认前轮修订未生效）。剩余为空 → `pass`；否则 `revise` |
| **code-review** | 同上合并 issues；某条 issue 暴露设计骨架错（命名错位 / 关系建错 / 用例缺失等） → `backtrack`, `backtrack-to: design`（**design 不在 stages_enabled 时降级为 `revise`**）；否则有 issue → `revise`；无 issue → `pass` |
| **test** | 三类指标（成功 / 失败 / 回归）全 pass 且全覆盖 → `pass`；失败可在实现层修 → `revise`；失败暴露 design / code-review 漏的根因 → `backtrack`, `backtrack-to: design` 或 `code-review` |
| **docs** | 把本轮观察的所有建议与历史 plan 合并；**仅本轮新增** = (本轮 - 历史) 中的非冗余条目。新增 = 0 → `pass`；新增 > 0 → `revise` |

### 3. 收口副作用

按 stage：

| stage | 副作用 |
|---|---|
| design-review | （仅 progress.txt 一行） |
| code-review   | （仅 progress.txt 一行） |
| test          | （仅 progress.txt 一行） |
| docs          | (a) progress.txt 顶部 `## Codebase Patterns` 段追加本轮新增的 **docs 阶段发现的可复用模式**（创建该段如不存在；**分工边界**：implement 写实现踩坑，docs plan 写 docs 阶段发现的模式，两者不交叉）；(b) 重写 `<task_dir>/docs-update-suggestions.md`：跨所有轮次 project / engineering 级建议的最新合并视图（新轮覆盖 / 补充旧轮同目标文件的建议） |

注意 docs 的 project / engineering 级建议**只汇总**到 `docs-update-suggestions.md`，**不**直接改受管工程文件（仓库边界严格）。

### 4. 写 plan 输出

写 `<exec_dir>/<S>-<NNN>-plan.md`：

```markdown
---
verdict: pass | revise | backtrack
backtrack-to: design | code-review   # 仅 backtrack 时
issues:
  - "<merged issue 1>"
sources:
  - "<S>-<NNN>a.md"          # 或单 executor 时只一项
  - "<S>-<NNN>b.md"
new_in_this_round: <count>   # 仅 docs 时；其它阶段省略
---

# Plan iter-<N> (stage: <S>)

## 合并结论
<verdict 一句话理由>

## 合并的 issues
<逐条>

## 与历史对照
<新发现 / 仍未解决 / 已闭合>

## 备注
<...>
```

`exec_dir` 与 executor 同目录（`reviews/` 或 `test-runs/` 或 `docs-rounds/`）。

### 5. 追加 progress.txt

末尾追加：

```
## [<ISO>] <S> iter-<N> (plan)
- verdict: <V>; issues: <count>[; backtrack-to: <T>][; new: <count>]
---
```

### 6. sentinel

写 `<task_dir>/.runs/plan-<S>-<NNN>.json`：

```json
{
  "stage": "<S>",
  "phase": "plan",
  "iteration": <N>,
  "status": "ok" | "failed",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "summary": "<one-line>",
  "fail_reason": "<仅 failed 时填>"
}
```

与 failure_log 条目 `{stage:S, phase:"plan", ...}` 保持同构，便于统一解析。

无法完成（exec 观察缺失 / 历史读不出 / 副作用写失败等）→ `status: "failed"`。

## 返回

`plan-<S> iter-<N>: verdict=<V> issues=<count>`

## 关键约束

- **只读 executor 观察**；不读源码、不跑测试、不动 git
- **不修改 executor 输出文件**
- ensemble 阶段两份都必须读；任一缺失 → sentinel.failed（**不**用单份硬判）
- backtrack-to 必须是 `design` 或 `code-review` 之一；其它一律 revise
- docs 阶段的 project / engineering 级建议**只汇总到 docs-update-suggestions.md**，永不直接改受管工程文件
- pass 不是"差不多过得去"；ensemble 阶段单轮即决，要严
