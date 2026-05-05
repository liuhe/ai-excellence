// v6.2 Model Types - supports both English and Chinese keys

export interface Model {
  business: Business;
  system: SystemView;
  basePath?: string;       // viewer-injected: 模型根的 dev server 绝对路径，如 `/vchat-p2p-native/`，用于 markdown 相对链接解析
}

// === Business View ===

export interface Business {
  organization?: string;
  business_workers?: string | string[];
  external_parties?: ExternalParty[];
  systems?: SystemDef[];
  business_use_cases?: BusinessUseCase[];
  docs?: Doc[];
  // Chinese keys
  组织?: string;
  业务工人?: string | string[];
  外部参与方?: ExternalParty[];
  系统?: SystemDef[];
  业务用例?: BusinessUseCase[];
  扩展文档?: Doc[];
}

export interface ExternalParty {
  name?: string;
  type?: 'system' | string;
  participants?: Participant[];
  use_cases?: { name?: string; actor?: string; 名称?: string; 执行者?: string }[];
  // Chinese keys
  名称?: string;
  类型?: string;
  参与者?: Participant[];
  用例?: { name?: string; actor?: string; 名称?: string; 执行者?: string }[];
}

export interface Participant {
  name?: string;
  type?: 'person' | 'device' | 'system' | string;
  // Chinese keys
  名称?: string;
  类型?: string;
}

export interface SystemDef {
  name?: string;
  use_cases?: SystemUseCase[];
  名称?: string;
  用例?: SystemUseCase[];
}

export interface SystemUseCase {
  name?: string;
  package?: string;
  actor?: string;
  entry?: string;
  associations?: Association[];
  名称?: string;
  分组?: string;
  执行者?: string;
  入口?: string;
  关联?: Association[];
}

export interface BusinessUseCase {
  name?: string;
  actor?: string;
  system_use_cases?: string[];
  stakeholder_interests?: StakeholderInterest[];
  docs?: Doc[];
  名称?: string;
  执行者?: string;
  系统用例?: string[];
  相关方利益?: StakeholderInterest[];
  扩展文档?: Doc[];
}

export interface StakeholderInterest {
  stakeholder?: string;
  interest?: string;
  相关方?: string;
  利益?: string;
}

// === System View ===

export interface SystemView {
  data_models?: DataModel[];           // = 业务模型实体（business-model）；保留旧字段名避免 viewer 大改
  businessModelDiagram?: string;       // business-model.yaml 的 diagram 字段（业务模型 ER 图）
  overview?: OverviewEdge[];
  topologyDiagram?: string;
  applications?: Application[];
  docs?: Doc[];
  // Chinese keys
  数据模型?: DataModel[];
  概览?: OverviewEdge[];
  子系统?: Application[];
  扩展文档?: Doc[];
}

export type Archetype = 'moment-interval' | 'role' | 'party-place-thing' | 'description';

export interface DataModel {
  name?: string;
  table_name?: string;
  archetype?: Archetype;
  relationships?: Relationship[];   // 出向关系（统一关系模型）
  _sourceDir?: string;            // viewer-injected: detail YAML 所在目录绝对路径
  fields?: Record<string, string>[];
  notes?: string;
  state_machine?: StateMachine;
  rules?: EntityRule[];
  docs?: Doc[];
  // Chinese keys
  名称?: string;
  表名?: string;
  字段?: Record<string, string>[];
  备注?: string;
  状态机?: StateMachine;
  规则?: EntityRule[];
  扩展文档?: Doc[];
}

export interface EntityRule {
  content?: string;
  field?: string;
  related_use_cases?: string[];
  // Chinese
  内容?: string;
  关联属性?: string;
  关联用例?: string[];
}

export interface StateMachine {
  field?: string;
  states?: string[];
  transitions?: Transition[];
  notes?: string;
  // Chinese
  字段?: string;
  状态?: string[];
  转换?: Transition[];
  备注?: string;
}

export interface Transition {
  from?: string;
  to?: string;
  trigger?: string;
}

export type RelationshipKind = 'depends-on' | 'implements' | 'associates' | 'composition';

export type RelationshipTargetKind =
  | 'business-entity'
  | 'role'
  | 'aggregate'
  | 'value-object'
  | 'repository'
  | 'domain-service'
  | 'domain-event';

export interface Relationship {
  kind?: RelationshipKind;
  target?: string;
  target_kind?: RelationshipTargetKind;
  bidirectional?: boolean;        // only meaningful for kind=associates
  cardinality?: string;           // one-to-one / one-to-many / many-to-one / many-to-many
  via?: string;
  note?: string;
}

export interface OverviewEdge {
  from?: string;
  to?: string;
  label?: string;
  type?: 'sync' | 'call';
  details?: string[];
}

export interface Infrastructure {
  name?: string;
  type?: string;
  description?: string;
  // Chinese
  名称?: string;
  类型?: string;
  描述?: string;
}

export interface Application {
  name?: string;
  type?: 'frontend' | 'client' | 'backend' | 'proxy' | 'external';
  _sourceDir?: string;             // viewer-injected: detail YAML 所在目录绝对路径，用于 markdown 相对链接解析
  tech_stack?: TechStack;
  infrastructure?: Infrastructure[];
  pages?: Page[];
  use_cases?: AppUseCase[];
  domain_model?: AppDomainModel;   // 应用领域模型（DDD），可选
  docs?: Doc[];
  // Chinese
  名称?: string;
  类型?: string;
  技术栈?: TechStack;
  基础设施?: Infrastructure[];
  页面?: Page[];
  用例?: AppUseCase[];
  扩展文档?: Doc[];
}

export interface TechStack {
  language?: string;
  frameworks?: string[];
  storage?: string;
  middleware?: string[];
  implementation?: string;
  // Chinese
  语言?: string;
  框架?: string[];
  存储?: string;
  其他中间件?: string[];
  实现?: string;
}

export interface Page {
  name?: string;
  related_use_cases?: string[];
  external_links?: { label?: string; url?: string }[];
  display_mappings?: string[];
  // Chinese
  名称?: string;
  关联用例?: string[];
  外部链接?: { [key: string]: string }[];
  显示映射?: string[];
}

export interface AppUseCase {
  name?: string;
  package?: string;
  actor?: string;
  api?: string[];
  rules?: (string | UCRule)[];
  associations?: Association[];
  docs?: Doc[];
  // Chinese
  名称?: string;
  分组?: string;
  执行者?: string;
  api路径?: string[];
  规则?: (string | UCRule)[];
  关联?: Association[];
  扩展文档?: Doc[];
}

export interface UCRule {
  content?: string;
  related_entities?: string[];
  // Chinese
  内容?: string;
  关联实体?: string[];
}

export interface Association {
  relation?: 'Include' | 'Extend';
  application?: string;
  name?: string;
  // Chinese
  关系?: string;
  子系统?: string;
  名称?: string;
}

// === Application Domain Model (DDD) ===

export interface AppAggregate {
  name?: string;
  root?: string;                   // 聚合根
  relationships?: Relationship[];  // 出向关系
  entities?: { name?: string; relationships?: Relationship[]; fields?: Record<string, string>[] }[];
  value_objects?: { name?: string; relationships?: Relationship[]; fields?: Record<string, string>[] }[];
  invariants?: string[];
  notes?: string;
}

export interface AppValueObject {
  name?: string;
  relationships?: Relationship[];
  fields?: Record<string, string>[];
}

export interface AppRole {
  name?: string;
  methods?: string[];
  relationships?: Relationship[];
  notes?: string;
}

export interface AppRepository {
  name?: string;
  relationships?: Relationship[];   // expected: kind=composition, target_kind=aggregate
  operations?: string[];
}

export interface AppDomainService {
  name?: string;
  relationships?: Relationship[];
  operations?: string[];
  notes?: string;
}

export interface AppDomainEvent {
  name?: string;
  published_when?: string;
  relationships?: Relationship[];
  payload?: Record<string, string>[];
}

export interface AppDomainModel {
  roles?: AppRole[];
  aggregates?: AppAggregate[];
  value_objects?: AppValueObject[];
  repositories?: AppRepository[];
  domain_services?: AppDomainService[];
  domain_events?: AppDomainEvent[];
}

export interface Doc {
  name?: string;
  type?: 'image' | 'article';
  path?: string;
  // Chinese
  名称?: string;
  类型?: string;
  路径?: string;
}

// === Helper to normalize bilingual keys ===

export function n<T>(obj: T | undefined, ...keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined) return String(v);
  }
  return '';
}

export function na<T>(obj: T | undefined, ...keys: string[]): unknown[] {
  if (!obj) return [];
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined) {
      if (Array.isArray(v)) return v;
      return [v];
    }
  }
  return [];
}
