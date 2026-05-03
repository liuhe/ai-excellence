# v6.2 建模约定

> v6.2 元模型的设计约定与使用规范。Schema 定义见 [meta-model.schema.yaml](meta-model.schema.yaml)，AI 建模指引见 [system-modeling-prompt.md](system-modeling-prompt.md)，参考实现见 [examples/chargable-proxy/model/](examples/chargable-proxy/model/)。

## 1. 视图分层

系统从 4 个固定视图描述，每个视图回答一类问题：

| 视图 | 回答 | 主要内容 |
|------|------|---------|
| **业务视图** | 谁？为谁创造什么价值？ | 业务执行者 / 业务用例 / 系统列表 / 系统用例 |
| **领域模型视图** | 业务涉及哪些核心数据？ | 实体 / 字段 / 状态机 / 业务规则 / 实体关系 |
| **系统逻辑视图** | 软件由哪些应用组成？怎么实现？ | 应用（子系统）/ 应用拓扑 / 子系统用例 / 页面 |
| **系统部署视图** | 怎么部署？怎么配置？ | 物理拓扑 / 节点 / 端口 / 安全 / 配置 |

### 关键归属边界

- **系统、系统用例归业务视图**——它们是业务流程分析的产出，不是系统实现
- **领域模型独立成视图**——不在 system 段下（与 v6.2 早期 schema 的差异，schema 已对齐调整）
- **系统逻辑视图的入口是"应用"**——业务视图说"系统提供什么能力"，系统逻辑视图说"应用怎么实现这些能力"
- **页面归系统逻辑视图**——是前端应用的一部分，不独立成视图

## 2. 三层用例结构

| 层级 | 所在视图 | 定位 | 承载内容 |
|------|---------|------|---------|
| **业务用例** | 业务视图 | 价值主张 | WHO gets WHAT value，关联系统用例 |
| **系统用例** | 业务视图 | 系统对外能力 | 能力声明 + entry 入口，**无规则** |
| **子系统用例** | 系统逻辑视图（应用内）| 实现逻辑 | 规则跟着负责的应用走，Include/Extend 链接 |

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
- Overview/Details 是相对的——每个层级都可再切（应用是系统逻辑视图 overview 的元素，但应用内部又有自己的 overview 和 details）

### Overview 该放什么

| 视图 | Overview |
|------|---------|
| 业务 | 全部内容（业务执行者 / 业务用例 / 系统 / 系统用例），结构小，不必拆 details |
| 领域模型 | 实体清单（name + 一句简介）+ 完整 relationships |
| 系统逻辑 | 应用清单（name + tech_stack 概要）+ application_topology |
| 部署 | 物理节点 + 网络拓扑 |

### Details 该放什么

视图内部按主题拆，对应 details 目录下的多个文件：

- 领域模型 details：每个实体一个文件，含完整 fields / state_machine / rules / notes
- 系统逻辑 details：每个应用一个文件，含完整 use_cases / pages / infrastructure
- 业务 details：可选——复杂业务流程时序、外部参与方约定等
- 部署 details：可选——安全配置、扩缩容策略、灾备方案

## 4. 文件组织规范

### 目录结构

```
<project>/model/
├── business.yaml              # 业务视图 overview
├── business/                  # 业务视图 details（可选）
├── domain.yaml                # 领域模型 overview
├── domain/                    # 领域模型 details
│   ├── <entity>.yaml          # 每个实体一个文件
│   └── er.svg                 # 关系图（diagram 字段引用）
├── system-logic.yaml          # 系统逻辑 overview
├── system-logic/              # 系统逻辑 details
│   ├── <app>.yaml             # 每个应用一个文件
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
| 数据模型（实体） | 全局 |
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
# domain.yaml
relationships: [...]
diagram: ./domain/er.svg
```

Viewer 在该字段所在位置渲染 SVG。

### 关键约束

**SVG 是 YAML 的可视化呈现，不能携带 YAML 之外的信息**——保证图与数据不漂移。理论上 SVG 应可由 YAML 数据生成，未来 AI skill 实现这点。

## 7. 建模路径（入手点）

视图维度固定，但建模起点可变。按项目类型选：

| 项目类型 | 推荐起点 | 然后展开 |
|---------|---------|---------|
| **需求驱动 / 探索型** | 业务视图（业务用例） | → 领域模型 → 系统逻辑 → 部署 |
| **技术驱动 / 改造型** | 系统逻辑视图（应用拓扑） | → 业务视图回填 → 领域模型 → 部署 |
| **数据中心型** | 领域模型视图 | → 业务视图 → 系统逻辑 → 部署 |

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

## 决策日期

| 约定 | 确定日期 |
|------|---------|
| 三层用例结构 | 2026-03-14 |
| 外部参与方结构 | 2026-03-14 |
| 用例 Package 分组 | 2026-03-17 |
| 4 视图 / Overview-Details 递归 / 多文件 / SVG / 命名空间 | 2026-04-26 |
