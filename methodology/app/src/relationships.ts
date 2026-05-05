import type { Relationship } from './types'

// 抽出关系列表中第一条匹配的目标
export function firstTargetOf(
  rels: Relationship[] | undefined,
  kind: Relationship['kind'],
  targetKind?: Relationship['target_kind'],
): string | undefined {
  if (!rels) return undefined
  for (const r of rels) {
    if (r.kind !== kind) continue
    if (targetKind && r.target_kind !== targetKind) continue
    if (r.target) return r.target
  }
  return undefined
}

// 抽出关系列表中所有匹配的目标
export function targetsOf(
  rels: Relationship[] | undefined,
  kind: Relationship['kind'],
  targetKind?: Relationship['target_kind'],
): string[] {
  if (!rels) return []
  return rels
    .filter(r => r.kind === kind && (!targetKind || r.target_kind === targetKind))
    .map(r => r.target || '')
    .filter(Boolean)
}

// 取关系列表中实现的 Role 列表（target_kind=role）
export function rolesOf(rels: Relationship[] | undefined): string[] {
  return targetsOf(rels, 'implements', 'role')
}

// 取关系列表中实现的业务实体（跨层映射；返回首个，因为一般只一条）
export function businessEntityOf(rels: Relationship[] | undefined): string | undefined {
  return firstTargetOf(rels, 'implements', 'business-entity')
}

// 取仓储管理的聚合（kind=composition, target_kind=aggregate）
export function repositoryAggregateOf(rels: Relationship[] | undefined): string | undefined {
  return firstTargetOf(rels, 'composition', 'aggregate')
}

// 业务模型层：把每个 entity 的 relationships 聚合成全局的 (from, to, ...) 列表，给 ER 图用
import type { DataModel } from './types'

export interface BusinessRelationshipEdge {
  from: string
  to: string
  kind?: Relationship['kind']
  target_kind?: Relationship['target_kind']
  cardinality?: string
  via?: string
  note?: string
  bidirectional?: boolean
}

export function gatherBusinessModelRelationships(dataModels: DataModel[]): BusinessRelationshipEdge[] {
  const out: BusinessRelationshipEdge[] = []
  for (const dm of dataModels) {
    const fromName = (dm.name || dm.名称 || '').toString()
    if (!fromName) continue
    for (const r of (dm.relationships || [])) {
      out.push({
        from: fromName,
        to: (r.target || '').toString(),
        kind: r.kind,
        target_kind: r.target_kind,
        cardinality: r.cardinality,
        via: r.via,
        note: r.note,
        bidirectional: r.bidirectional,
      })
    }
  }
  return out
}
