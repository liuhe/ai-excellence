---
name: aie-test-add
description: 给受管工程添加一个 aie 测试用例（prompt + 判断标准），存入该工程 .claude/aie-tests/
user_invocable: true
---

# /aie-test-add [project] [name]

把一个测试用例写入 `receivers/<project>` 软链对应的受管工程的 `.claude/aie-tests/<name>.md`。aie-improve 会跑这些用例评估受管工程的 AI 协作配置是否真的起效。

## 参数

- `[project]`：可选。`receivers/` 下软链名。未提供则**先询问用户**（列出 `projects/` 当前可用项）。
- `[name]`：可选。测试用例 slug（kebab-case）。未提供则交互式询问。

## 测试用例文件格式

`<target>/.claude/aie-tests/<name>.md`：

```markdown
---
name: <slug>
description: <一行说明这个用例在检验什么>
created: YYYY-MM-DD
prompt: |
  <交给 claude -p 跑的多行 prompt>
criteria:
  - <判断标准 1>
  - <判断标准 2>
---

# 备注（可选）

记录这个用例的来由、覆盖哪个事故 / 哪类失效模式，等等。
```

字段说明：
- `prompt`：用 YAML block scalar（`|`）保留换行。这是受管工程内会通过 `claude -p` 跑的 prompt。
- `criteria`：LLM-as-judge 用的检查项，写成自然语言要点。判官会逐条核对响应是否满足。

## 执行步骤

1. **解析 project**
   - 有参数 → 检查 `receivers/<project>` 是软链；不存在则报错列出可用项目
   - 无参数 → 列出 `receivers/` 下所有软链，问用户选哪个

2. **收集 name / description / prompt / criteria**
   - 任一缺失就向用户交互式询问
   - `name` 必须是 kebab-case；检查 `<target>/.claude/aie-tests/<name>.md` 是否已存在，已存在则问"覆盖 / 改名 / 取消"
   - `prompt` 支持多行，引导用户把"模拟一次真实使用"那段内容贴进来
   - `criteria` 支持多条，按行收集；用户输入空行结束

3. **预览文件内容**
   - 把组装好的 frontmatter + 正文给用户看完整 markdown
   - 让用户确认后再写

4. **写入**
   - 若 `<target>/.claude/aie-tests/` 不存在则创建
   - 写入 `<target>/.claude/aie-tests/<name>.md`
   - 报告路径与下一步建议：`/aie-improve <project>` 跑评估

## 关键约束

- **不修改** `<target>` 的 CLAUDE.md / settings.json / 其他既有文件；本命令只往 `aie-tests/` 下加文件
- `created` 字段使用当天日期（绝对日期，不要"今天"这种相对表达）
- 若 `<target>/.claude/` 不存在说明该工程还没跑过 `/aie-apply`，提示用户先跑 `/aie-apply <project>`
