# AI 观察数据模型

> 用于"AI 任务复杂度度量与观察"能力的底层数据模型。本文档只定义**实体、字段、关系**；采集机制、目录规范、分析工具在其他文档中另行讨论。

## 定位

- 属于 `/aie-apply` 的**可选特性**（默认不启用，需用户在应用时确认）
- 启用后，被管工程在本地目录（暂命名 `.aie/observations/`，gitignored）按本模型记录 AI 行为数据
- 目的：为后续做"复杂度打分—行为指标—人工效果标"的相关性分析提供底料

## 模型边界

本模型**只覆盖 LLM 交互层的可观察行为**：即"每次向模型的输入、每次模型的输出、每次工具调用、每次会话派生"。

以下**不覆盖**：
- 编排层的纯代码决策（例：Devin 的 planner 内部路由、Claude Code harness 里非 LLM 的判断逻辑）
- 工具内部状态（例：长运行 shell session 的环境变量、editor 的 buffer 状态）
- 采集实现（例：hooks 打点、父子对话 id 传递机制）

这些属于 orchestrator 或工具自身的领域，除非它主动暴露 trace，否则数据模型看不到。

## 实体总览

```
Conversation ──has──> Generation ──emits──> ToolCall
     ▲   ▲              trigger:               │
     │   │              - user_input ────► UserInput
     │   │              - tool_results ───► ToolCall(s)
     │   │              - initial_spawn ──► ToolCall (父的)
     │   │                                     │
     │   └── has ── ToolCall                   │
     │                                         │(agent 类)
     └── spawned_by_tool_call_id ◄─────────────┘
                          (双向: ToolCall.spawned_conversation_id)

UserInput ── conversation_id ──> Conversation
   （UserInput 记录发生在哪个 conv，但不作为 Conversation 的直接子物；
     由 Generation.trigger 从触发链一侧引用进来）

Hooks 就近挂靠：
  - Conversation.hooks: session_start / session_end / notification / subagent_stop
  - Generation.hooks:   user_prompt_submit / stop / pre_compact
  - ToolCall.hooks:     pre_tool_use / post_tool_use
```

## 实体

### 1. Conversation（对话）

一个 Claude Agent 会话实例（顶层或子 agent）。**纯容器**：直接持有 Generation 和 ToolCall，不直接持有 UserInput。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `spawned_by_tool_call_id` | null 表示 root；非 null 时指向父 ToolCall（双向：ToolCall.spawned_conversation_id 也保留冗余，方便双向查看） |
| `root_conversation_id` | 冗余字段，快速定位整棵树 |
| `agent_type` / `subagent_type` | 顶层是 `claude`，子对话是具体 agent 名 |
| `model` | 如 `opus-4-7` / `sonnet-4-6` |
| `started_at` / `ended_at` | |
| `hooks` | `[HookEvent]`，此对话级别触发的 hook（session_start / session_end / notification / subagent_stop 等） |

### 2. UserInput（用户主动输入事件）

只存在于用户键入的时刻。**子 agent conv 不会产生 UserInput**（子 conv 的初始输入通过 Generation.trigger=initial_spawn 表达）。独立成实体是为了后续做人工评估时有稳定 id 可挂。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `conversation_id` | 发生在哪个 conv |
| `seq_no` | 此 conv 内第几个 UserInput |
| `content` | `[ContentBlock]` —— 支持多模态（见下方结构） |
| `attachments` | hook 追加的 additional context（如 UserPromptSubmit 注入） |
| `kind` | `new_task` / `follow_up` / `approval` / `refusal` / `interrupt` / `other` |
| `submitted_at` | |

**ContentBlock 结构**：
```
{ type: "text",  digest, length,                          inline_text?, blob_path? }
{ type: "image", digest, size_bytes, media_type,                        blob_path? }
{ type: "file",  digest, size_bytes, media_type, filename?,             blob_path? }
{ type: "audio", digest, duration_ms, media_type,                       blob_path? }
```

**原件存储策略**：
- `digest` + `length`/`size_bytes` 是必填元数据 —— 用于对齐、去重、快速统计
- 短文本可以走 `inline_text` 直接内联在 JSON 记录里
- 图片 / 文件 / 音频 / 长文本走 `blob_path`，指向旁路目录里的原件文件（如 `.aie/blobs/<digest>.<ext>`），**不 inline base64**（会把观测 JSON 撑爆）
- **默认采集"存原件"**（review 时要能回看到底输入了什么）；只在明确关闭原件保留时才退化为"只有 digest"

### 3. Generation（一次模型生成）

一次"模型出一段输出"的完整单元（对应 Claude API 的一个 assistant turn）。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `conversation_id` | 归属对话 |
| `seq_no` | 此对话内第几次生成 |
| `trigger` | 多态属性 `{ type, payload }` —— 见下方类型表 |
| `output_text` | 用户可见的文本输出（`{ digest, length, inline_text?, blob_path? }`；存储策略同 ContentBlock） |
| `thinking_text` | 模型推理内容（`{ digest, length, inline_text?, blob_path? }`；同上） |
| tokens | `input` / `output` / `thinking` / `cache_read` / `cache_write` |
| `context_length` | 该次生成时的上下文总长 |
| `stop_reason` | `end_turn` / `tool_use` / `max_tokens` / `pause_turn` / `refusal` / … |
| `was_interrupted` | bool，此次生成是否被用户中途打断 |
| `context_compression` | null 或 `{ before_tokens, after_tokens }`（此次生成前若发生压缩） |
| `retried_from` | null 或 generation_id（若为重试） |
| `hooks` | `[HookEvent]`，此生成生命周期内触发的 hook（user_prompt_submit / stop / pre_compact 等） |
| `started_at` / `ended_at` | |

**trigger 类型**：

| `trigger.type` | `trigger.payload` | 场景 |
|---|---|---|
| `user_input` | `{ user_input_id }` | 顶层 conv 里 UserInput 触发生成 |
| `tool_results` | `{ tool_call_ids: [...] }` | 前面一或多个 ToolCall 结果回来触发继续生成（agent 类工具返回也是这类，Agent 只是特殊工具） |
| `initial_spawn` | `{ spawning_tool_call_id }` | 子 conv 的第一次生成，由父 ToolCall 派生启动，无 UserInput |

### 4. ToolCall（一次工具调用）

Generation 的下游、下一次 Generation 的上游。

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `conversation_id` | 归属对话 |
| `requested_by_generation_id` | 是哪次 Generation 发起的（唯一发起源，无需多态 trigger） |
| `seq_no` | 在发起方 Generation 内第几个 tool_use（并行调用排序） |
| `name` | 工具名（`Bash` / `Read` / `Agent` / …） |
| `args` | `{ digest, length, inline_text?, blob_path? }`，存储策略同 ContentBlock |
| `result` | `{ digest, length, inline_text?, blob_path?, status }`（`status`: success/error） |
| `latency_ms` | |
| `needed_permission` | bool，是否触发权限拦截 |
| `spawned_conversation_id` | Agent 类工具派生了子 conv 时指过去（双向：Conversation.spawned_by_tool_call_id） |
| `hooks` | `[HookEvent]`，此工具调用生命周期内触发的 hook（pre_tool_use / post_tool_use 等） |
| `started_at` / `ended_at` | |

## HookEvent（嵌入结构，不独立成实体）

在 Conversation / Generation / ToolCall 的 `hooks` 字段里出现。**就近挂靠原则**：hook 归属它最直接影响的实体。

| 字段 | 说明 |
|---|---|
| `name` | hook 名（`UserPromptSubmit` / `PreToolUse` / `PostToolUse` / `Stop` / `SessionStart` / `Notification` / …） |
| `phase` | `before` / `after`（相对于载体实体的生命周期） |
| `fired_at` | 时间戳 |
| `payload_digest` | hook 输入/输出摘要 |
| `decision` | 可选，若 hook 返回了决策（`allow` / `deny` / `modify` / `inject_context` 等） |

## 关系总表

| From | To | 基数 | 承载字段 |
|---|---|---|---|
| Conversation | Conversation（派生子） | 1→* | 子 `Conversation.spawned_by_tool_call_id` → ToolCall → `requested_by_generation_id` → Generation.conversation_id |
| Conversation | Generation | 1→* | `Generation.conversation_id` |
| Conversation | ToolCall | 1→* | `ToolCall.conversation_id` |
| Conversation | UserInput | 1→* | `UserInput.conversation_id`（弱关联；顶层 conv 才有；Conversation 不主动"持有"） |
| Generation | ToolCall（发起） | 1→* | `ToolCall.requested_by_generation_id` |
| Generation | UserInput（触发源） | *→0..1 | `Generation.trigger.payload.user_input_id`（trigger.type=user_input 时） |
| Generation | ToolCall（触发源） | *→* | `Generation.trigger.payload.tool_call_ids`（trigger.type=tool_results 时） |
| Generation | ToolCall（初始 spawn 源） | *→0..1 | `Generation.trigger.payload.spawning_tool_call_id`（trigger.type=initial_spawn 时） |
| ToolCall | Conversation（派生子） | 0..1→0..1 | `ToolCall.spawned_conversation_id`（与 Conversation.spawned_by_tool_call_id 双向） |

## 典型触发链示例

- **顶层 conv C1**：`UserInput U1` 到达 → 触发 `Generation G1`（trigger=user_input, user_input_id=U1）→ G1 emit `ToolCall T1`（Agent 类）→ T1 spawn 子对话 `C2`
- **子 conv C2**：初始生成 `Generation G2`（trigger=initial_spawn, spawning_tool_call_id=T1）→ G2 emit `ToolCall T2`（普通工具）→ T2 结果回来 → 触发 `Generation G3`（trigger=tool_results, tool_call_ids=[T2]）→ G3 stop_reason=end_turn，C2 结束
- **回到 C1**：T1 结果（即 C2 的返回）回来 → 触发 `Generation G4`（trigger=tool_results, tool_call_ids=[T1]）→ G4 stop_reason=end_turn，等待下一个 UserInput

## 典型查询示例

- **一个 UserInput 展开了多长执行链？** 从 `Generation where trigger.user_input_id=U` 起，递归展开：其 ToolCalls → 派生子 conv → 子 conv 的所有 Generation
- **哪些 UserInput 触发了子对话（架构复杂度高）？** `ToolCall where spawned_conversation_id is not null` → `requested_by_generation_id` → 上溯 trigger 链到 UserInput
- **某个工具用错的频率？** 后续 Label 引入后：`ToolCall where name=X` join Label
- **一次生成并行发起了几个工具？** `count(ToolCall where requested_by_generation_id=G)`
- **一次生成的输入吸收了几个工具结果？** `Generation.trigger.payload.tool_call_ids` 的长度（trigger.type=tool_results 时）
- **某个 hook 是否与某类翻车相关？** 在 Generation/ToolCall 上直接读 `hooks` 字段，join 未来的 Label
- **对话树的深度？** 从任一 Conversation 沿 `spawned_by_tool_call_id → ToolCall.requested_by_generation_id → Generation.conversation_id` 递归

## 对齐检查

已按 Claude Code 与 Devin 的典型执行流做过覆盖性 review：

- **Claude Code**：全覆盖（Messages API 的 user/assistant turn、工具并行调用、Agent 派生子 conv、四大 hook 时机、prompt caching、extended thinking、context 压缩、用户打断、权限拦截、slash command 均能表达）
- **Devin**：核心执行链能覆盖（planner/executor 多 LLM 调用、长运行 stateful 工具、子任务派生、异步用户交互、多模态输入）；其编排层内部非 LLM 决策**不在本模型覆盖范围**（见"模型边界"段）

## 不在本文档范围

- 采集机制（hooks 打点实现、父子对话 id 传递协议）
- 目录结构与文件格式（JSONL vs per-file JSON、schema_version 字段位置等）
- 高层复杂度打分（Task 级别的 3 维输入/推理/架构 打分模型）
- 人工评估（Label 实体）—— 后续会在 UserInput / Generation / ToolCall 等实体上引入
- 分析与可视化工具
