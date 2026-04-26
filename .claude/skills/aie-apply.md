---
name: aie-apply
description: 审查并将 ai-excellence 规范应用到被管工程
user_invocable: true
---

# /aie-apply <project>

将下述规范应用到 `projects/<project>` 软链对应的被管工程：先审查现状，给出 diff，用户确认后合并写入。

## 参数

- `<project>`：必填，`projects/` 下软链名。无参数则报错并列出可用项目。

## 关键原则

`~/.claude/CLAUDE.md` 只放极少数纯个人偏好；跨项目通用的工作规范应通过本命令推到项目级 `CLAUDE.md`，而不是堆在全局。本命令写入的就是项目级 `CLAUDE.md`，遵循这一原则。

## 注意：两个 `projects/` 含义不同

- **ai-excellence 的 `projects/`**：被管工程的**软链入口**（`projects/<name>` 是软链）
- **被管工程内部的 `projects/`**：initiative 容器（`projects/<initiative>/{overview,tasks,log,design}.md`）

本命令操作的对象是后者：解析 ai-excellence 的 `projects/<project>` 软链 → 进入被管工程 → 检查/写入被管工程内部的 CLAUDE.md 和 .claude/settings.json。规范里说的 `projects/<name>/` 都是指**被管工程内部的**那个 projects。

## 要应用到被管工程的规范

被管工程最终应满足 A、B 两块。

### A. 被管工程的 CLAUDE.md 必须包含

```markdown
## 硬性约束

- **禁止写 memory 文件**：`~/.claude/projects/*/memory/` 下的文件不受 git 管理，不可写入。所有需要跨对话保留的知识一律写入本文件（`CLAUDE.md`）或 `projects/` 下的项目文件。

## 工作模式（每次对话必须执行）

本文件是知识库入口，也是工作模式的执行保障。**核心原则：持续更新，贯穿整个对话。**

### 对话开始时

判断当前模式：
- **通用模式**：不针对具体项目 → 依赖本文件
- **项目模式**：用户说明在做某个项目 → 执行以下流程：
  1. 检查 `projects/<name>/` 是否存在
  2. **已有项目**：读取 `overview.md`、`tasks.md`、`log.md`，了解目标、任务状态和历史后再开始工作
  3. **新项目**：先与用户交互补全 `overview.md`（项目目标是必须有的），再创建 `tasks.md` 和 `log.md`，然后才开始工作

### 对话过程中

随时更新，**对话结束前必须主动确认日志已是最新**。按知识性质分层落位（详见 `knowledge-structure.md`）：

- **核心常驻约束**（每次对话都需要的规则） → `CLAUDE.md`，保持精简
- **参考数据 / 业务规则**（按需引用的数据、映射、配置） → 独立文件（如 `docs/<topic>.md`），`CLAUDE.md` 仅放一行指针
- **低频操作流程**（步骤序列） → `.claude/skills/<name>.md`
- **项目（initiative）内进展**（任务状态、踩坑、决策） → `projects/<name>/{tasks,log}.md`

不确定该放哪？停下来与用户确认。

### 项目文件结构

`projects/<name>/` 下：
- `overview.md` — 项目目标（必有）
- `design.md` — 设计方案（可选，涉及系统改动、平滑发布等需要提前规划时创建）
- `tasks.md` — 任务列表，每个任务下可有注意事项；状态图标：`🔘` 待办 `🚀` 进行中 `✅` 完成
- `log.md` — `YYYY-MM-DD HH:MM` + 做了什么；成功不加说明，失败要写原因

### 知识库结构约束

本工程本身就是一个知识库，目录结构必须保持用户可理解、可审查。

- 添加或修改任何目录（新建顶级目录、重组、改变约定）必须先与用户确认
- 目录约定记录在 `knowledge-structure.md`，新人读完即能理解工程组织
- 修改 `knowledge-structure.md` 也需先与用户确认
```

### B'. 被管工程必须存在 `.claude_global/` 目录与 `.gitignore` 条目

`<target>/.claude_global/` 目录内含 3 个软链，分别指向 `~/.claude/` 下的配置：
- `CLAUDE.md` → `~/.claude/CLAUDE.md`
- `settings.json` → `~/.claude/settings.json`
- `settings.local.json` → `~/.claude/settings.local.json`

`<target>/.gitignore` 必须包含 `.claude_global`（个人配置不应入团队 git）。

设计意图：从任意工程根目录都能访问/编辑全局配置（`vi .claude_global/CLAUDE.md` 等价于改 `~/.claude/CLAUDE.md`），同时确保不被误提交。

### B. 被管工程的 .claude/settings.json 必须包含的 hooks

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"处理用户请求前，先判断上一轮是否有需要记录的内容（操作结果、领域知识、决策等）。按 knowledge-structure.md 的分层落位：核心常驻约束→CLAUDE.md；参考数据→独立文件；操作流程→.claude/skills/；项目内进展→projects/<name>/{tasks,log}.md。有则先更新，没有则直接处理请求。\"}}'"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "你是项目验收 agent。任务刚完成，你需要评估它是否真正达成了项目目标。\n\n步骤：\n1. 找到当前项目目录（projects/ 下），读取 overview.md 了解项目目标\n2. 读取 tasks.md 了解当前任务的具体要求\n3. 检查实际完成情况，重点关注：\n   - 目标是否完整达成（不只是表面完成）\n   - 有无稳定性问题（边界情况、异常输入、并发等）\n   - 有无遗漏的关键场景\n   - 有无潜在的副作用或破坏性\n4. 判断：\n   - 如果完全达成且稳健：输出 {\"decision\": \"allow\"}\n   - 如果存在不足：输出 {\"decision\": \"block\", \"reason\": \"具体说明哪些方面不足，需要做什么才能达成目标\"}",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### C. 被管工程必须存在 `knowledge-structure.md`

`<target>/knowledge-structure.md` 用于记录顶级目录约定，让新人能快速理解工程组织。最小格式：

```markdown
# <项目名> 知识库结构

> 本工程的目录组织方式。新增/修改任何目录需先与用户确认。修改本文件也需先确认。

## 顶级目录

- `<dir>/` — 用途
- `<dir>/` — 用途

## projects/<name>/ 文件约定（若使用项目模式）

- `overview.md` — 项目目标
- `tasks.md` — 任务列表
- `log.md` — 日志
- `design.md` — 设计（可选）
```

缺失时按项目当前实际顶级目录列表生成草稿；用途说明优先从既有 `CLAUDE.md` 内容提取，否则按目录名推测并明确标注为"建议"，请用户确认后写入。

## 执行步骤

1. **解析参数与目标**
   - 检查 `projects/<project>` 存在且为软链
   - 解析软链得到真实路径 `<target>`

2. **审查 `<target>`**
   - 读 `<target>/CLAUDE.md`（不存在视为缺失）
   - 检查是否包含 A 节四块：硬性约束、工作模式、项目文件结构、知识库结构约束
   - 读 `<target>/.claude/settings.json`（不存在视为缺失）
   - 检查 hooks 是否包含 B 节两个 hook（按 hookEventName 与关键内容判断，不要求字符串完全一致）
   - 检查 `<target>/.claude_global/` 是否存在且包含 3 个有效软链分别指向 `~/.claude/{CLAUDE.md,settings.json,settings.local.json}`
   - 检查 `<target>/.gitignore` 是否包含 `.claude_global`
   - 检查 `<target>/knowledge-structure.md` 是否存在

3. **输出审查报告**
   - 列出缺失项与不合规项
   - 全合规 → 报 ok 直接结束

4. **生成修改方案**
   - CLAUDE.md：合并而非覆盖（保留项目原有内容，把规范追加/插入到合适位置；已有但不合规则给出局部修改）
   - `.claude/settings.json`：合并 hooks 字段，不动其他字段
   - `.claude_global/` 目录：缺失则创建，并在内部建 3 个软链 → `~/.claude/{CLAUDE.md,settings.json,settings.local.json}`
   - `.gitignore`：缺 `.claude_global` 则追加
   - `knowledge-structure.md`：缺失则扫描项目顶级目录生成草稿，用途说明优先从 CLAUDE.md 提取、否则按目录名推测并标"建议"，请用户审核确认后写入
   - `projects/` 目录：**不主动创建**，留给项目模式启动时按需创建

5. **展示 diff，请用户逐项确认**

6. **写入并报告结果**
   - 输出验证清单：建议用户回到被管工程跑一次，确认 hooks 触发、CLAUDE.md 加载

## 关键约束

- 所有写入前必须给 diff 让用户确认
- CLAUDE.md 与 settings.json 都是**合并而非覆盖**
- 不主动创建 `projects/<initiative>/` 脚手架
