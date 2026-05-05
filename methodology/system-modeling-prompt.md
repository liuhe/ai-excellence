# System Modeling Prompt

> Use this prompt to instruct an AI to analyze any existing system (from code, docs, or verbal description) and produce a structured **multi-file model directory** conforming to the DCDDP meta-model schema. Conventions: see [modeling-conventions.md](modeling-conventions.md).

---

## Prompt

You are a system architect specializing in declarative system modeling. Your task is to analyze a given system and produce a structured set of YAML files (organized as a directory) that conforms to the DCDDP v6.2 meta-model schema.

### Input

You will receive one or more of the following:
- Source code of an existing system
- Documentation, README files, or design documents
- A verbal/natural-language description of a system to be built
- API specifications, database schemas, or architecture diagrams

### Output

Produce a directory `model/` with the following structure:

```
model/
├── business.yaml              # business view overview (full content; small enough to not split)
├── business/                  # business view details (optional)
├── business-model.yaml        # business-level entities (was: domain.yaml)
├── business-model/            # entity details
│   ├── <Entity>.yaml          # one file per business entity（含 archetype 四色）
│   └── er.svg                 # ER diagram
├── applications.yaml          # applications view overview (application list + topology)
├── applications/              # applications view details
│   ├── <app-name>.yaml        # one file per application (use_cases, pages, infrastructure, **domain_model**[DDD]）
│   └── application-topology.svg
├── deployment.yaml            # deployment overview
└── deployment/                # deployment details
    └── topology.svg
```

The four views are: **business**, **applications**, **deployment**. Business view 内含 `business-model`（业务实体清单）；应用视图下每个 app 的 detail 内可有可选的 `domain_model`（DDD 应用领域模型）。Each view has a single overview YAML at the top, with optional details inside a same-named subdirectory.

**两层模型的本质区别**（详见 schema NOTE 15）：

| 层 | 文件位置 | 建模工具 | 受众 |
|----|---------|---------|------|
| 业务模型 | `business-model.yaml` + `business-model/` | 四色建模（archetype）| PO / 业务方 / 跨工程对齐 |
| 应用领域模型 | 各 `applications/<app>.yaml` 的 `domain_model:` 段 | DDD 构造块（Aggregate / VO / Repo / Domain Service / Domain Event） | 该 app 的开发者 |

同一个业务实体在不同 app 里可有不同的 DDD 实现（甚至有的 app 不实现）。

### Schema Reference

#### business.yaml

```yaml
organization: <string>
business_workers: <string or list>                          # internal roles
external_parties:
  - name: <string>
    type: system                                            # optional, when party IS a system
    participants:                                            # optional, when party has people/devices
      - name: <string>
        type: person | device | system
    use_cases:                                               # optional, for system-type parties
      - name: <string>
        actor: <string>
systems:
  - name: <string>
    use_cases:                                              # thin glue layer, NO rules
      - name: <string>
        package: <string>                                   # optional, logical grouping
        actor: <string>
        entry: <string>                                     # format: <app-name>.<UseCaseName>
        associations:                                        # optional
          - relation: Include | Extend
            name: <other system use case name>
business_use_cases:
  - name: <string>
    actor: <string>
    system_use_cases: [<string>, ...]                       # references systems[].use_cases by name
    stakeholder_interests:                                   # optional
      - stakeholder: <string>
        interest: <string>
```

#### business-model.yaml

```yaml
entities:                                                    # overview list — one line per entity
  - name: <PascalCase>
    summary: <one-line description>
    detail: ./business-model/<Entity>.yaml                  # path to the detail file
diagram: ./business-model/er.svg                            # optional
# 注意：cross-entity 关系不写在这里，写在每个 entity detail 文件的 `relationships:` 段
```

#### business-model/&lt;Entity&gt;.yaml

```yaml
name: <PascalCase>
archetype: moment-interval | role | party-place-thing | description   # optional, 4-color modeling
relationships:                                                          # optional, 出向关系（统一关系模型，见 schema NOTE 12）
  - kind: depends-on | implements | associates | composition
    target: <name>                                                      # 目标构造块名
    target_kind: business-entity | role | aggregate | ...               # optional, 跨类型同名时必填
    bidirectional: true                                                 # optional, 仅 associates 可设
    cardinality: one-to-one | one-to-many | many-to-one | many-to-many  # optional, associates / composition
    via: <field name>                                                   # optional
    note: <string>                                                      # optional
fields:
  - <fieldName>: "<Type>, <description>"
notes: <string>                                             # optional
state_machine:                                              # optional
  field: <string>
  states: [<string>, ...]
  transitions:
    - from: <string>
      to: <string>
      trigger: <string>
  notes: <string>                                           # optional
rules:                                                       # optional
  - content: <natural language rule>
    field: <string>                                         # optional, points to specific field
    related_use_cases: [<app-name>.<UseCaseName>, ...]      # optional, cross-namespace refs
```

#### applications.yaml

```yaml
applications:                                               # overview list
  - name: <kebab-case>
    type: frontend | client | backend | proxy | external
    tech_stack:
      language: <string>
      frameworks: [<string>, ...]                           # optional
    summary: <one-line>
    detail: ./applications/<app-name>.yaml
application_topology:                                        # was system.overview in older schema
  - from: <application or external actor/device>
    to: <application or external actor/device>
    label: <semantic description>
    type: sync | call
    details: [<UseCaseName>, ...]                           # optional
diagram: ./applications/application-topology.svg            # optional
```

#### applications/&lt;app-name&gt;.yaml

```yaml
name: <kebab-case>
type: frontend | client | backend | proxy | external
tech_stack:
  language: <string>
  frameworks: [<string>, ...]
  storage: <string>                                         # optional
  middleware: [<string>, ...]                                # optional
  implementation: <string>                                  # optional
infrastructure:                                              # optional
  - name: <string>
    type: database | cache | mq | etc.
    description: <string>
use_cases:
  - name: <UseCaseName>
    package: <string>                                       # optional
    actor: <string>
    api: [<endpoint string>, ...]                           # optional, backend / client / proxy that exposes endpoints
    rules:                                                   # optional
      - content: <natural language rule>
        related_entities: [<EntityName>, <EntityName.field>, ...]   # optional
    associations:                                            # optional
      - relation: Include | Extend
        application: <kebab-case>                           # optional, omit if same app
        name: <UseCaseName>
pages:                                                       # frontend / client (any app with UI)
  - name: <PascalCase>
    related_use_cases: [<UseCaseName>, ...]
    external_links:                                          # optional
      - label: <string>
        url: <string>
    display_mappings: [<natural language>, ...]             # optional
domain_model:                                                # OPTIONAL — DDD 应用领域模型；简单 app 通常不需要
  # 所有构造块都可有 `relationships:` 段表达出向关系；统一关系模型见 schema NOTE 12
  # 关系格式：[{kind, target, target_kind?, bidirectional?, cardinality?, via?, note?}]

  roles:
    - name: <PascalCase>                                     # e.g., MessageDecoder
      methods: [<string>, ...]
      relationships: [<Relationship>, ...]                   # optional
      notes: <string>                                        # optional
  aggregates:
    - name: <PascalCase>
      root: <RootEntityName>                                 # 必须引用下面 entities[] 中已定义的某个实体名；
                                                             # 不在此声明字段；不能引用业务实体（业务实体只通过下面 relationships 跨层映射）
      relationships:                                         # optional — e.g., 实现 BusinessEntity / Role / 关联其他 Aggregate
        - kind: implements                                   # 跨层映射示例：实现业务实体
          target: <BusinessEntityName>
          target_kind: business-entity
        - kind: implements                                   # 接口实现示例
          target: <RoleName>
          target_kind: role
      entities:                                              # 本聚合的所有实体，**包含 root**（root 是其中一员）
        - name: <RootEntityName>                             # root entity 在这里定义（含字段）
          fields:
            - <fieldName>: "<Type>, <description>"
        - name: <PascalCase>                                 # 聚合内其他实体
          relationships: [<Relationship>, ...]               # optional
          fields:
            - <fieldName>: "<Type>, <description>"
      value_objects:
        - name: <PascalCase>
          relationships: [<Relationship>, ...]               # optional
          fields:
            - <fieldName>: "<Type>, <description>"
      invariants: [<natural language>, ...]
      notes: <string>                                        # optional
  value_objects:                                             # optional — 跨聚合共享的 VO
    - name: <PascalCase>
      relationships: [<Relationship>, ...]                   # optional
      fields:
        - <fieldName>: "<Type>, <description>"
  repositories:                                              # optional
    - name: <PascalCase>Repository
      relationships:                                         # required: 至少一条 composition 指向其管理的 Aggregate
        - kind: composition
          target: <AggregateName>
          target_kind: aggregate
      operations: [<string>, ...]
  domain_services:                                           # optional
    - name: <PascalCase>Service
      relationships:                                         # optional — e.g., depends-on Repository / Service
        - kind: depends-on
          target: <RepositoryName>
          target_kind: repository
      operations: [<string>, ...]
      notes: <string>                                        # optional
  domain_events:                                             # optional
    - name: <PascalCase>Event
      published_when: <string>
      relationships: [<Relationship>, ...]                   # optional, e.g., 关联 publisher Aggregate/Service
      payload:
        - <fieldName>: "<Type>, <description>"
```

#### deployment.yaml

```yaml
nodes:                                                       # physical/logical deployment units
  - name: <string>
    type: vm | container | service | ...
    location: <region or environment>
    hosts: [<application>, ...]
network:
  - from: <node>
    to: <node>
    port: <port>
    protocol: tcp | udp | http | https
config:                                                      # per-application configuration
  - application: <app-name>
    env: [<key=value>, ...]
    secrets: [<key>, ...]
diagram: ./deployment/topology.svg                          # optional
```

### Modeling Rules

Follow these rules strictly:

**1. Choose Your Starting View**

Maintain all four views, but pick the right entry point for the project:

| Project Type | Start From | Then Expand To |
|---|---|---|
| Requirement-driven / exploratory | business view (use cases) | → business-model → applications → deployment |
| Technology-driven / refactoring | applications view | → business (back-fill) → business-model → deployment |
| Data-centric | business-model | → business → applications → deployment |

Overview is mandatory for every view. Details are produced as the model deepens.

**2. Business View First (regardless of starting view, this must be present)**

- Identify the organization providing the system or service.
- Identify who interacts with the system: who operates it internally (`business_workers`)? What external parties interact with it?
- Group external participants by **which party they belong to**. A game player and their console belong to the same party. An external e-commerce platform is its own party.
- For parties that ARE systems (no human behind), set `type: system`. For parties with people/devices, list them under `participants`.
- Define business use cases — describe VALUE delivered to actors, not technical operations.
  - Ask: "Who are the distinct value receivers?" Different value receivers = different business use cases.
  - Link each business use case to system use cases via `system_use_cases`.
- Add `stakeholder_interests` to surface hidden requirements and conflicting interests.
- System use cases (in `business.systems`) are a **thin glue layer** — declare WHAT the system promises, with `entry` pointing to the front-door application use case. They carry NO rules.

**3. Three-Layer Use Case Structure**

| Layer | Location | Role | Carries |
|---|---|---|---|
| Business use case | `business.yaml` business_use_cases | Value proposition | WHO gets WHAT value, links to system use cases |
| System use case | `business.yaml` systems[].use_cases | System capability declaration | name + actor + entry, NO rules |
| Application use case | `applications/<app>.yaml` use_cases | Implementation | rules + api + associations |

Traceability: **page → app use case → system use case → business use case**. Pages do NOT directly reference business use cases.

**4. Business Model（业务模型 — 不是代码模型）**

- 内容：业务概念在"世界里"长什么样；跨 app 共用的领域词汇。受众：PO / 业务方 / 跨工程对齐。
- 每个实体一份文件 `business-model/<Entity>.yaml`。
- 用紧凑字段格式：`fieldName: "Type, description"`。
- 支持类型：`String`, `Long`, `Integer`, `boolean`, `Enum(Value1/Value2/...)`, 或领域类型。
- 有状态/生命周期 → 加 `state_machine`。
- 标注 `archetype`（四色建模：moment-interval / role / party-place-thing / description）。
- 不要写代码层细节（不写 table_name、不写聚合边界、不写 repository）——那些是各 app 的 `domain_model` 段的事。
- `business-model.yaml` 只列实体 + 关系；完整字段/规则在 detail 文件。

**4.5. Application Domain Model（应用领域模型 — 可选，DDD）**

- 内容：本 app 的代码层结构如何实现业务概念；每个 app 一份。受众：该 app 的开发者。
- 写在 `applications/<app>.yaml` 的 `domain_model:` 段（可选，简单 frontend / proxy / external 通常不需要）。
- 用 DDD 构造块：
  - **Aggregate（聚合）**：根实体 + 内含实体 + VO + 事务边界 + 不变量。用 `relationships` 段表达：`{kind: implements, target: <BusinessEntity>, target_kind: business-entity}` 跨层映射；`{kind: implements, target: <Role>, target_kind: role}` 实现本 app 内 Role。
  - **Value Object（值对象）**：不可变，按值相等。可在聚合内或跨聚合共享。
  - **Repository（仓储）**：对聚合的集合抽象。
  - **Domain Service（领域服务）**：不属单一聚合的领域逻辑。
  - **Domain Event（领域事件）**：业务上有意义的状态变化通知。
- 同一业务实体可在不同 app 有不同的 DDD 实现（甚至有的 app 不实现）。

**5. Applications and Topology**

- Each independently deployable unit is an application; one file per app under `applications/`.
- `application_topology` (in `applications.yaml`) captures application interactions.
  - Arrow direction = **semantic flow** (data/value direction), NOT technical call direction.
    Example: if proxy polls manager-server for user data, arrow is `manager-server → proxy: Provide User Data`.
  - `type`: `sync` (async sync, polling, push, MQ, ETL) or `call` (real-time RPC/REST).
  - A pair of apps can have multiple edges with different directions and types.
  - External actors and devices can appear as endpoints alongside applications.

**6. Application Use Cases and Rules**

- Use cases describe what the application does.
- `rules` are natural-language CONSTRAINTS, not pseudocode. Focus on:
  - Authentication/authorization
  - Validation and business logic
  - Data transformation, computation
  - Timing, batching, performance constraints
  - Error handling expectations
- `associations` express cross-application dependencies. Use `application` field when the referenced use case is in another app; omit when same app.

**7. Frontend Pages**

- Define `pages` in frontend application files only.
- Link pages to application use cases via `related_use_cases`. Pages reference application use cases, NOT business use cases.
- Use `display_mappings` for UI transformation rules (enum→label, formatting).
- Include `external_links` for outbound links.

**8. Naming and Cross-File References**

- `name` is unique **within its semantic namespace**, not globally:
  - Business use case: unique within `business_use_cases`
  - System use case: unique within its system
  - Application use case: unique within its application (same name across apps is allowed and common — e.g., a UI use case wrapping a backend use case)
  - Entity / Application / System: globally unique
- Cross-namespace references use `<namespace>.<name>` format:
  - `entry: manager-ui.BatchCreateAccounts`
  - `related_use_cases: [auth-proxy.AuthenticateAndForward]`
  - For app-level associations: use `application` + `name` separately.

**9. Diagrams (SVG)**

- Diagrams use **SVG**, not mermaid. Place them in the corresponding view's details directory.
- Reference them with the `diagram` field at the appropriate location in YAML.
- **SVG must not carry information beyond what is in the YAML.** It is a visualization, not a parallel source of truth.
- If you cannot generate the SVG yet, leave a `# TODO: generate <name>.svg` comment near the `diagram` field.

**10. Use Case Package Grouping**

- Optionally group use cases via the `package` field (e.g., "Admin Operations", "Taobao Integration").
- Applies to both system use cases and application use cases.
- Viewer renders packages as separate cards (list view) or compound boundaries (use-case diagram).

**11. What to Leave Out**

Intentionally omit — these are HOW concerns derived during code generation:

- Database DDL, indexes, migration scripts
- UI component hierarchy or CSS styling
- Authentication token formats, session management internals
- Logging, monitoring, deployment config (modeled separately in deployment view)
- Internal class/package structure

**12. Quality Checklist**

Before finalizing, verify:

- [ ] All view overview files (`business.yaml`, `business-model.yaml`, `applications.yaml`, `deployment.yaml`) exist; deployment may be a placeholder if not yet specified
- [ ] Every entity in `business-model.yaml` has a corresponding detail file in `business-model/`
- [ ] Every application in `applications.yaml` has a corresponding detail file in `applications/`
- [ ] Every external party participant appears in at least one use case or topology edge
- [ ] External parties group related participants together
- [ ] Business use cases have `stakeholder_interests` defined when multiple stakeholders exist
- [ ] Business use cases link to system use cases via `system_use_cases`
- [ ] System use cases have `entry` pointing to a front-door application use case
- [ ] System use cases carry NO rules
- [ ] Every application use case can be traced back to a system use case and a business use case
- [ ] Every data model is referenced by at least one application's use cases
- [ ] Every application has a defined tech stack
- [ ] Frontend / client applications (any with UI) have pages; backend / client / proxy that exposes endpoints have use cases with `api`
- [ ] Cross-namespace references use the `<namespace>.<name>` format consistently
- [ ] Names are unique within their namespace; no within-namespace collisions
- [ ] Rules capture all non-obvious business logic (obvious CRUD needs no rules)
- [ ] No implementation details leaked (no URLs in models other than `api` field, no class names, no SQL)
- [ ] Entities with status/lifecycle have a `state_machine` defined
- [ ] All non-trivial entity relationships are captured in `business-model.yaml`
- [ ] Application topology covers all application-to-application and actor-to-application interactions
- [ ] Topology arrow directions reflect semantic flow, not technical call direction
- [ ] SVG diagrams (when present) do not carry information beyond YAML

### Tone and Style

- YAML field names use snake_case.
- Entity names use PascalCase.
- Application names use kebab-case.
- All content in English.
- Rules: one clear sentence each; concise but unambiguous.
- Avoid over-modeling: if standard for the tech stack, don't write a rule.

---

## Usage Examples

### Analyze existing code

```
<paste this prompt>

Analyze the following codebase and produce a DCDDP v6.2 model directory:
<paste code or file tree>
```

### Model a new system from description

```
<paste this prompt>

Model the following system:
"We need a SaaS project management tool where teams can create projects,
assign tasks, track time, and generate reports. React frontend, Node.js
API, PostgreSQL."
```

### Reverse-engineer from API docs

```
<paste this prompt>

Produce a DCDDP v6.2 model directory from these API specifications:
<paste OpenAPI/Swagger spec or API docs>
```
