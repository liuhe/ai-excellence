---
name: aie-improve
description: 评估受管工程的 AI 协作配置（CLAUDE.md / Skills / Hooks）并跑该工程的 aie 测试用例，给出改进建议
user_invocable: true
---

# /aie-improve [project]

对 `projects/<project>` 软链对应的受管工程做两件事：

1. **静态体检**：分析 CLAUDE.md 体量、逐条评审规则、检测重复与失焦
2. **行为测试**：跑该工程 `.claude/aie-tests/` 下的用例，看实际 AI 行为是否符合预期

最后汇总改进建议清单。**默认只读，不直接改文件**。

## 参数

- `[project]`：可选。`projects/` 下软链名。未提供则**先询问用户**（列出 `projects/` 当前可用项）。

## 执行步骤

### 1. 解析目标工程

- 有参数 → 检查 `projects/<project>` 是软链；不存在报错列可用项
- 无参数 → 列出 `projects/` 下所有软链，问用户选哪个再继续
- 解析软链得到 `<target>` 绝对路径

### 2. 静态体检

读取并分析以下内容：

**CLAUDE.md 体量**：
- 行数、估算 token（粗略：1 token ≈ 3.5 中文字符 或 4 英文字符）
- 标记是否超出舒适区：>200 行提示"偏大"，>300 行提示"明显过载"

**逐条规则评审**（用三问框架）：

把 CLAUDE.md 按章节/要点切分成"规则单元"。对每条问：

1. **频率**：每次对话都用得到吗？
   - 答否 → 建议挪到 `.claude/skills/`（按需加载）
2. **性质**：这是规则还是数据？
   - 是数据（映射表、配置表、术语表）→ 建议拆到独立 `docs/*.md`，CLAUDE.md 只留一行指针
3. **刚性**：靠 AI 理解够吗？还是必须强制？
   - 出现"必须 / 绝不 / 禁止 / 一定要" + 性质属于可机械检查 → 建议升级为 Hook

输出表格：`规则摘要 | 频率 | 性质 | 刚性 | 建议动作`。

**重复 / 冲突检测**：
- 同主题规则散布多处 → 标记"可合并"
- 互相冲突的规则 → 标记"需要消歧"
- CLAUDE.md 内容与现有 `.claude/skills/` 重复 → 标记"已有 skill，CLAUDE.md 可删"

**Skills 与 Hooks 现状**：
- 列出 `<target>/.claude/skills/` 下的 skill 与各自 description
- 列出 `<target>/.claude/settings.json` 里的 hooks 事件
- 标记长期没被引用的 skill（启发式：CLAUDE.md / 其他 skill / 文档里都没提到名字）

### 3. 行为测试

**前置检查**：
- 若 `<target>/.claude/aie-tests/` 不存在或为空 → 跳过本节，在报告里注明"无测试用例，建议用 /aie-test-add 添加"
- 若 `claude` CLI 不可用 → 跳过本节并提示

**对每个 `<target>/.claude/aie-tests/*.md`**：

1. 解析 frontmatter，提取 `name` / `prompt` / `criteria`
2. 在 `<target>` 目录下执行：
   ```bash
   cd <target> && claude -p "<prompt>" --output-format json
   ```
   - 设合理超时（建议 180s，可按 prompt 复杂度调整）
   - 捕获 stdout / stderr / exit code
3. 把 (prompt, response, criteria) 送给 **LLM-as-judge**：
   - 在 ai-excellence 目录下另起 `claude -p` 调用，prompt 模板见下文
   - 要求结构化输出 `{passed: bool, reasoning: str, severity: low|med|high}`
4. 收集每个用例的 verdict

**判官 prompt 模板**：

```
你是 AI 协作配置测试的判官。给定一次 AI 对话的输入和响应，按"判断标准"评估是否通过。

【AI 的输入】
<prompt>

【AI 的响应】
<response>

【判断标准】
<criteria，逐条列出>

请输出 JSON：
{
  "passed": true | false,
  "reasoning": "逐条对照标准的简短说明",
  "severity": "low | med | high  (failure 时填，pass 时填 low)"
}

只输出 JSON，不要其他文字。
```

### 4. 汇总改进建议

按严重程度排序，每条包含：

- **scope**：CLAUDE.md / settings.json / skills / aie-tests
- **issue**：发现的问题（静态或测试）
- **suggestion**：建议的修改（具体到段落或字段，可附 diff 草案）
- **rationale**：为什么这样改（关联三问中的哪一问 / 哪个测试用例失败）

### 5. 输出报告

报告格式：

```
# /aie-improve 报告：<project>

## 体量
- CLAUDE.md：<N> 行 / 约 <M> tokens — <舒适 / 偏大 / 明显过载>

## 逐条规则评审
<表格>

## 重复与冲突
<列表>

## 测试结果
- 用例 1（<name>）：✅ pass / ❌ fail — <reasoning 摘要>
...
通过率：<X>/<Y>

## 改进建议（按 severity 排序）
1. [high] <scope> — <issue>
   - 建议：<suggestion>
   - 理由：<rationale>
...
```

报告末尾提示：**是否要把 high 级建议落地？是的话进入 diff 确认流程。** 用户同意才动文件，不同意就结束。

## 关键约束

- **默认只读**：体检和跑测试不动 `<target>` 任何文件
- **测试执行隔离**：`claude -p` 必须在 `<target>` 目录下跑，确保真实加载该工程配置；判官调用在 ai-excellence 目录下跑，避免混淆
- **保护用户工时**：单个测试 prompt 跑超时（>180s）就标 timeout 跳过，不卡死
- **判官独立性**：判官只看 (prompt, response, criteria)，不读 CLAUDE.md / 不参考其他用例，避免循环偏置
- **不替代 /aie-apply**：本命令只评估和建议；落地写入若涉及规范类内容仍走 `/aie-apply`
