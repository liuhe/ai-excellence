# v6.2 建模约定

> v6.2 元模型的设计约定与使用规范。Schema 定义见 [meta-model.schema.yaml](meta-model.schema.yaml)，AI 建模指引见 [system-modeling-prompt.md](system-modeling-prompt.md)，参考实现见 [examples/chargable-proxy/model/](examples/chargable-proxy/model/)。

## 1. 视图分层

系统从 4 个固定视图描述，每个视图回答一类问题：

| 视图 | 回答 | 主要内容 |
|------|------|---------|
| **业务视图** | 谁？为谁创造什么价值？业务里有哪些核心概念？ | 业务执行者 / 业务用例 / 系统列表 / 系统用例 / **业务模型**（业务实体，四色建模） |
| **应用视图** | 软件由哪些应用组成？每个应用怎么实现？ | 应用（子系统）/ 应用拓扑 / 子系统用例 / 页面 / **应用领域模型**（DDD 构造块，每个 app 各一份，可选） |
| **系统部署视图** | 怎么部署？怎么配置？ | 物理拓扑 / 节点 / 端口 / 安全 / 配置 |
| ~~领域模型视图~~ | （**已废止**——业务实体下沉为业务视图的一部分；代码层结构变成各 app 的应用领域模型） | |

### 关键归属边界

- **系统、系统用例归业务视图**——它们是业务流程分析的产出，不是系统实现
- **业务模型归业务视图**——业务实体（含 archetype 四色）是业务概念在"世界里"长什么样，跨 app 共用，不是某个 app 的代码结构
- **应用领域模型归应用视图**——每个 app 内部用 DDD 构造块（Aggregate / VO / Repo / Service / Event）建模代码层结构；同一业务实体在不同 app 可有不同实现
- **应用视图的入口是"应用"**——业务视图说"系统提供什么能力"，应用视图说"应用怎么实现这些能力"
- **页面归应用视图**——是前端应用的一部分，不独立成视图

## 2. 三层用例结构

| 层级 | 所在视图 | 定位 | 承载内容 |
|------|---------|------|---------|
| **业务用例** | 业务视图 | 价值主张 | WHO gets WHAT value，关联系统用例 |
| **系统用例** | 业务视图 | 系统对外能力 | 能力声明 + entry 入口，**无规则** |
| **子系统用例** | 应用视图（应用内）| 实现逻辑 | 规则跟着负责的应用走，Include/Extend 链接 |

### 追溯链路

```
页面 → 子系统用例 → 系统用例 → 业务用例
```

- 页面不直接关联业务用例
- `entry` 只指向入口子系统用例，后续通过 Include 链推导
- 业务用例拆分判断：**不同价值接收者 = 不同业务用例**

## 3. Overview / Details 递归

### 原则

- 每个视图都先给 **overview**（精简、全局、必读），再按需展开 **details**
- Overview/Details 是相对的——每个层级都可再切（应用是应用视图 overview 的元素，但应用内部又有自己的 overview 和 details）

### Overview 该放什么

| 视图 | Overview |
|------|---------|
| 业务 | 全部内容（业务执行者 / 业务用例 / 系统 / 系统用例），结构小，不必拆 details |
| 业务模型 | 实体清单（name + 一句简介）+ 完整 relationships |
| 应用视图 | 应用清单（name + tech_stack 概要）+ application_topology |
| 部署 | 物理节点 + 网络拓扑 |

### Details 该放什么

视图内部按主题拆，对应 details 目录下的多个文件：

- 业务模型 details：每个业务实体一个文件，含完整 fields / state_machine / rules / archetype / notes
- 应用视图 details：每个应用一个文件，含完整 use_cases / pages / infrastructure / **可选 domain_model**（DDD 构造块）
- 业务 details：可选——复杂业务流程时序、外部参与方约定等
- 部署 details：可选——安全配置、扩缩容策略、灾备方案

## 4. 文件组织规范

### 目录结构

```
<project>/model/
├── business.yaml              # 业务视图 overview
├── business/                  # 业务视图 details（可选）
├── business-model.yaml        # 业务模型 overview（业务实体清单 + 关系，归属业务视图）
├── business-model/            # 业务模型 details
│   ├── <Entity>.yaml          # 每个业务实体一个文件（含 archetype 四色）
│   └── er.svg                 # 关系图（diagram 字段引用）
├── applications.yaml          # 应用视图 overview
├── applications/              # 应用视图 details
│   ├── <app>.yaml             # 每个应用一个文件（含可选 domain_model 段：DDD 应用领域模型）
│   └── application-topology.svg
├── deployment.yaml            # 部署 overview
└── deployment/                # 部署 details
    └── topology.svg
```

### 命名约定

- Overview yaml 名为 `X.yaml`，对应 details 目录为 `X/`
- 同名约定让 viewer 自动扫描——overview yaml 不需要显式列出 details 文件清单
- Overview yaml 中可在每个项目下加 `detail: ./X/<file>.yaml` 字段显式指向详情文件（推荐——viewer 加载效率高，跳转明确）

### 文件粒度

- 一个实体一个文件，一个应用一个文件——AI 友好（小窗口处理）
- 跨视图的零碎细节可放 `details/` 子目录，不强制对应到某个实体或应用

## 5. 跨文件引用与命名空间

### 命名空间唯一规则

`name` 字段在**其语义命名空间内**唯一（不要求全局唯一）：

| 实体类型 | 命名空间 |
|---------|---------|
| 业务用例 | `business_use_cases` 列表内 |
| 系统用例 | 所在系统内 |
| 子系统用例 | 所在应用内（跨应用可同名） |
| 业务实体 | 业务模型内全局 |
| 应用领域模型构造（Aggregate / VO / Repo / Service / Event） | 所在 app 内 |
| 应用 | 全局 |
| 系统 | 全局 |

### 跨命名空间引用

用 `<namespace>.<name>` 格式：

- `entry: manager-ui.BatchCreateAccounts` —— 系统用例的 entry 字段引用某应用的子系统用例
- `related_use_cases: [auth-proxy.AuthenticateAndForward]` —— 实体规则引用的子系统用例
- `associations: [{relation: Include, application: manager-server, name: SyncAccountData}]` —— 子系统用例间跨应用引用，用 `application` + `name` 字段

### Viewer 责任

- 加载时合并所有 yaml，校验命名空间内 name 冲突
- 跨文件引用支持点击跳转

## 6. 图（Diagram）规范

### 格式

- 使用 **SVG**（替代 mermaid）——更灵活，未来由 AI skill 生成
- SVG 文件放在所属视图的 details 目录下：`./<view>/<topic>.svg`

### 引用方式

YAML 中通过 `diagram` 字段引用：

```yaml
# business-model.yaml
relationships: [...]
diagram: ./business-model/er.svg
```

Viewer 在该字段所在位置渲染 SVG。

### 关键约束

**SVG 是 YAML 的可视化呈现，不能携带 YAML 之外的信息**——保证图与数据不漂移。理论上 SVG 应可由 YAML 数据生成，未来 AI skill 实现这点。

## 7. 建模路径（入手点）

视图维度固定，但建模起点可变。按项目类型选：

| 项目类型 | 推荐起点 | 然后展开 |
|---------|---------|---------|
| **需求驱动 / 探索型** | 业务视图（业务用例） | → 业务模型 → 应用视图（含应用领域模型） → 部署 |
| **技术驱动 / 改造型** | 应用视图（应用拓扑） | → 业务视图回填（业务用例 + 业务模型）→ 应用领域模型 → 部署 |
| **数据中心型** | 业务模型 | → 业务视图（业务用例）→ 应用视图（含应用领域模型）→ 部署 |

无论从哪入手，**最终四个视图都要补齐**。Overview 是必须的，details 按需展开。

## 8. 外部参与方结构

`business` 段下的 `external_parties` 取代了原来的 `stakeholders`。结构：

- `business_workers` 直接挂在 `business` 下（内部角色）
- `external_parties` 按"组织/方"分组：
  - **有参与者的方**：包含 `participants`（人/设备/系统）
  - **本身就是系统的方**：设 `type: system`
- 是否为"业务执行者"由 `business_use_cases` 的 `actor` 决定，不需要显式标注

```yaml
business:
  business_workers: [Admin]
  external_parties:
    - name: Switch Game Players
      participants:
        - name: Player
          type: person
        - name: Switch Console
          type: device
    - name: Taobao E-Commerce Platform
      type: system
```

**设计理由**：Player 和 Console 天然属于同一个"方"，按组织分组比按类型分组（人/设备/系统）更符合现实。

## 9. 用例 Package 分组

支持用例按 `package` 字段逻辑分组（如 "Admin Operations"、"Taobao Integration"），适用于系统用例和子系统用例两个层级：

- **列表视图**：按 package 分组为独立卡片
- **用例图**：dagre compound layout 画 package 子边界
- 向后兼容：无 package 字段时与原来一致

## 10. 实体 Archetype（四色建模，可选）

借自 Peter Coad《Java Modeling in Color With UML》。给实体打一个 `archetype` 标签，让 ER 图按颜色分类：

| Archetype | 颜色 | 含义 | 例 |
|-----------|------|------|-----|
| `moment-interval` | 粉 | 时刻 / 时段类，"什么发生了"。事件、过程、交易 | `Order`, `Payment`, `MediaFrame`, `ConnectionSession` |
| `role` | 黄 | 角色，"在某情境下扮演什么"。把 PPT 接入 MI | `Customer`, `Teacher`, `ConferenceHost` |
| `party-place-thing` | 绿 | 持续存在的人物地物（PPT），身份独立 | `Person`, `Node`, `Vehicle`, `Building` |
| `description` | 蓝 | 描述 / 规范 / 分类，可复用属性集 | `ProductType`, `ProxyConfig`, `PackageTemplate` |

**判断顺口溜（按优先级）**：

1. 有时间发生 → MI（粉）
2. "X as Y in Z" 表达（X 是个角色） → Role（黄）
3. 长期存在的具体存在 → PPT（绿）
4. 共享的属性集 / 配置规格 → Description（蓝）

**用法**：在 `business-model/<Entity>.yaml` 顶层加 `archetype: <type>` 字段。可选——不写则 viewer 用中性灰。建议在系统的核心业务实体上标，让 ER 图一眼分清概念边界。

> **注意**：archetype 只用在**业务模型**（业务视图下）。应用领域模型（应用视图，每个 app 内）用 DDD 构造块表达，不用四色——见下一节。

### Role = 接口/契约 + implements 关系

四色里的 **黄色 Role** 不是普通实体，本质是**接口**：定义"扮演这个角色需要满足什么"。其他实体（PPT / MI / Description）声明 `implements: [<RoleName>...]` 表示"我能扮演这些角色"。

```yaml
# business-model/Customer.yaml — 一个 Role 实体
name: Customer
archetype: role
fields:
  - canPlaceOrder: "Boolean (capability), 能否下单"

# business-model/Person.yaml — 一个 PPT 实体，扮演 Customer 角色
name: Person
archetype: party-place-thing
implements: [Customer, Employee]   # 同时是顾客和雇员
fields:
  - id: "..."
```

特点：
- 一个 PPT 可同时扮演多个 Role（多重身份）
- 一个 Role 可被多个 PPT 实现
- 严格：implements 的目标必须是同 business-model 内 archetype=role 的实体
- viewer 在 ER 图上用 UML realization 风格（虚线 + 空心三角箭头）渲染

## 11. 应用领域模型（DDD 构造块，可选）

写在 `applications/<app>.yaml` 的 `domain_model:` 段。每个 app 一份，不强制——简单 frontend / proxy / external 通常不需要；有内核逻辑的 backend / client 才填。

### 与业务模型的关系

| 层 | 文件位置 | 工具 | 受众 |
|----|---------|------|------|
| 业务模型 | `business-model/<Entity>.yaml` | 四色建模（archetype）| PO / 业务方 / 跨工程对齐 |
| 应用领域模型 | `applications/<app>.yaml` 的 `domain_model:` | DDD 构造块 | 该 app 的开发者 |

- 同一业务实体可在不同 app 有不同的 DDD 实现（vchat-relay 的 `Peer` 是简单路由表项；vchat-client 的 `Peer` 是富 Aggregate）
- 也可以**不实现**——某 app 根本用不到某业务实体就不出现
- 跨层映射用 `domain_model.aggregates[].business_entity: <BusinessEntityName>` 字段（接口/角色实现用单独的 `implements: [<RoleName>...]`）

### DDD 构造块

| 构造块 | 含义 | 例 |
|--------|------|-----|
| **Aggregate** | 根实体 + 内含实体 + VO + 事务边界 + 不变量 | `OrderAggregate` (root: Order, contains: OrderLine[], ShippingAddress) |
| **Value Object** | 不可变，按值相等 | `Money`, `Address`, `RouteState` |
| **Repository** | 对聚合的集合抽象 | `OrderRepository`（findById, save, findByCustomer 等） |
| **Domain Service** | 不属单一聚合的领域逻辑 | `PriceCalculator`（涉及 Order + Customer + Product） |
| **Domain Event** | 业务上有意义的状态变化通知 | `OrderShipped`（payload: orderId, trackingNo, shippedAt） |
| **Role** | 接口/契约：定义参与者要满足的能力（DDD 没现成构造块对应；本方法论显式建模） | `MessageDecoder`（method: decode(bytes)）, `RouteSelector`（method: pickRoute(peers)） |

### Role 与 implements 关系（应用领域层）

应用层 Role 与业务模型 Role 概念一致——都是接口契约。区别在范围：

- 业务模型 Role：跨 app 共享的业务能力契约（如 `Customer`、`Approver`）
- 应用 Role：本 app 内的代码层契约（如 `MessageDecoder`、`RouteSelector`、`PaymentGateway`），可能因实现技术不同而抽象出来

```yaml
# applications/manager-server.yaml
domain_model:
  roles:
    - name: PriceQuoter
      methods: ["quote(orderItems) -> Money"]
      notes: 给一组订单项报价；不同促销策略走不同实现
  aggregates:
    - name: OrderAggregate
      business_entity: Order             # 跨层映射：本聚合实现哪个业务实体
      implements: [PriceQuoter]          # 本 app 内本聚合扮演的角色（接口实现）
      ...
```

注意：

- `business_entity:` 是 **跨层映射**（应用层 → 业务层），不是接口实现
- `implements:` 是 **本层接口实现**（本 app 内）
- 二者**不同概念，不要混用**——例如 OrderAggregate 实现 Order 业务实体（`business_entity: Order`）的同时也扮演 PriceQuoter 角色（`implements: [PriceQuoter]`）

### 判断"什么需要 DDD 建模"

- **Aggregate**：有事务边界（一次操作改变多个东西，必须一起成功/失败）+ 有不变量（违反就是 bug）
- **VO**：纯描述无身份（删了再造一个等价的，没人在乎）；常见错例：把 `Address` 当 Entity（错——地址没身份）
- **Repository**：每个 Aggregate 一个 Repository（数据怎么存是 Repo 的事，业务逻辑不关心）
- **Domain Service**：跨多个 Aggregate 的逻辑（不属于任何单个 Aggregate）
- **Domain Event**：有业务方需要知道、可能触发其他流程的状态变化（不是普通日志）

## 12. 模型 / 代码一致性（硬约束）

> 这是 DCDDP 区别于"画图工具"的关键。模型不是装饰品，是 source of truth。

### 不变式

1. **代码反映模型，不是相反**。代码命名、类型签名、模块边界、文件组织必须跟模型一致。讨论一个概念时**只用模型里的命名**——模型说 `Peer`，代码就不能叫 `PeerRoute`。
2. **改模型 = 同步改代码**。模型变更（实体重命名 / 字段重组 / 关系调整 / 状态机调整 / archetype 调整）必须在**同一次工作**内伴随代码的对应改动落地。不允许只动模型不动代码，也不允许"模型先改，代码下次再排期"。
3. **改代码 = 先对齐模型**。系统变更（新增功能 / 修改流程 / 重构边界）必须先在模型层讨论清楚（涉及的实体 / 用例 / 规则 / 关系），再动代码。不允许先改代码再回头补模型。
4. **不分阶段、不留半成品**。改动量大时，先把模型改完整（产出一份完整的目标模型），再让代码追上；不允许"模型半重构"或"代码半重构"。
5. 模型与代码不一致即视为债务。检测到（旧名称残留、字段错配、用例缺失）下一个 commit 优先消除。

### AI 在受管工程内的具体行为

| 用户说 | AI 应该 |
|--------|---------|
| "改下代码 X" | 先看模型；X 在模型里叫什么？模型未表达 → 先补模型 |
| "加个新功能" | 先回到用例层（业务 → 系统 → 应用）对齐入口，再涉及实体/规则，最后才进代码 |
| "重命名 X" | 模型 + 代码 + 文档/测试/配置 一次同步改；单点改视为不完整 |
| "这块大改，怎么排期？" | **不要主动提议"先做 A 再做 B"的阶段拆分**——用户没要求时默认一次性彻底重构 |

### 例外（很少）

- 调研 / 设计阶段：明确说"我在探讨方向"时，可以只在模型层 sketch，标记为草稿
- 临时验证：明确说"这是 PoC / 一次性脚本"时可以绕过模型，但不进 main 分支
- 代码层纯重命名（不改语义）：模型不变情况下可只动代码

## 决策日期

| 约定 | 确定日期 |
|------|---------|
| 三层用例结构 | 2026-03-14 |
| 外部参与方结构 | 2026-03-14 |
| 用例 Package 分组 | 2026-03-17 |
| 4 视图 / Overview-Details 递归 / 多文件 / SVG / 命名空间 | 2026-04-26 |
| 应用 type `client` / 网络 protocol `udp` / relation `composition` / 实体 archetype 4 色 | 2026-05-03 |
| 模型 / 代码一致性硬约束（第 12 节） | 2026-05-03 |
| 业务模型 / 应用领域模型分层（第 11 节）+ 文件组织从 `domain/` → `business-model/` + 各 app 加 `domain_model` 段 | 2026-05-03 |
