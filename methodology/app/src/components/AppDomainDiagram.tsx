import dagre from 'dagre'
import type { Application } from '../types'
import { repositoryAggregateOf } from '../relationships'

// 自动生成应用领域模型图（DDD 构造块）
// 节点：Aggregate（以 root entity 名呈现）/ Role / VO / Repository / Service / Event；
//       聚合内实体（除 root 外）/ 聚合内 VO 作为子节点
// 业务实体不画进图——它属于业务模型层，只在详情面板里显示（schema NOTE 17）
// 边（统一关系模型）：
//   depends-on   → 虚线 + 普通箭头
//   implements   → 虚线 + UML 空心三角（target=role）；target=business-entity 时不画（跨层）
//   composition  → 实线 + 实心菱形（聚合 → 内嵌实体/VO）
//   associates   → 实线 + 普通箭头（默认）
// 特例：Repository → Aggregate 用 manages（实线 + 空心菱形）

export function AppDomainDiagram({ app }: { app: Application }) {
  const dm = app.domain_model
  if (!dm) return null

  const roles = dm.roles || []
  const aggs = dm.aggregates || []
  const vos = dm.value_objects || []
  const repos = dm.repositories || []
  const svcs = dm.domain_services || []
  const evts = dm.domain_events || []

  if (
    roles.length + aggs.length + vos.length + repos.length + svcs.length + evts.length === 0
  ) return null

  type Kind = 'role' | 'aggregate' | 'vo' | 'repository' | 'service' | 'event' | 'inner-entity' | 'inner-vo'

  const STYLE: Record<Kind, { stroke: string; bg: string; label: string; dashed: boolean }> = {
    role:        { stroke: '#eab308', bg: '#fef9c3', label: 'Role',       dashed: true  }, // 黄
    aggregate:   { stroke: '#7c3aed', bg: '#f5f3ff', label: 'Aggregate (root)', dashed: false }, // 深紫（聚合 = 其根实体）
    vo:          { stroke: '#06b6d4', bg: '#cffafe', label: 'VO',         dashed: false }, // 青
    repository:  { stroke: '#475569', bg: '#f1f5f9', label: 'Repository', dashed: false }, // 深灰
    service:     { stroke: '#10b981', bg: '#d1fae5', label: 'Service',    dashed: false }, // 绿
    event:       { stroke: '#f59e0b', bg: '#fef3c7', label: 'Event',      dashed: false }, // 橙
    'inner-entity': { stroke: '#a78bfa', bg: '#f5f3ff', label: 'Entity',  dashed: false }, // 浅紫（聚合内非根实体）
    'inner-vo':  { stroke: '#67e8f9', bg: '#ecfeff', label: 'InnerVO',    dashed: false }, // 浅青
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 110, nodesep: 50, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  const NW = 170
  const NH = 56

  type NodeData = { kind: Kind; label: string; width: number; height: number }

  const NW_INNER = 140
  const NH_INNER = 44

  for (const r of roles) g.setNode(`role:${r.name}`, { kind: 'role', label: r.name || '', width: NW, height: NH } as NodeData)

  // Aggregate node uses root entity name as its label (per schema NOTE 17 viewer rule)
  for (const a of aggs) {
    const rootName = a.root || a.name || ''
    g.setNode(`agg:${a.name}`, { kind: 'aggregate', label: rootName, width: NW, height: NH } as NodeData)
    // 聚合内实体：跳过 root（root 已经由 aggregate 节点呈现）
    for (const e of (a.entities || [])) {
      if (e.name && e.name !== a.root) {
        g.setNode(`inner-entity:${a.name}:${e.name}`, { kind: 'inner-entity', label: e.name, width: NW_INNER, height: NH_INNER } as NodeData)
      }
    }
    for (const v of (a.value_objects || [])) {
      if (v.name) g.setNode(`inner-vo:${a.name}:${v.name}`, { kind: 'inner-vo', label: v.name, width: NW_INNER, height: NH_INNER } as NodeData)
    }
  }
  for (const v of vos) g.setNode(`vo:${v.name}`, { kind: 'vo', label: v.name || '', width: NW, height: NH } as NodeData)
  for (const r of repos) g.setNode(`repo:${r.name}`, { kind: 'repository', label: r.name || '', width: NW, height: NH } as NodeData)
  for (const s of svcs) g.setNode(`svc:${s.name}`, { kind: 'service', label: s.name || '', width: NW, height: NH } as NodeData)
  for (const e of evts) g.setNode(`evt:${e.name}`, { kind: 'event', label: e.name || '', width: NW, height: NH } as NodeData)

  // Edges
  type EdgeType = 'manages' | 'implements' | 'composition' | 'depends' | 'associates'
  type EdgeData = { type: EdgeType }
  const edges: { from: string; to: string; type: EdgeType }[] = []

  // (target_kind, target) → node id
  const TARGET_KIND_PREFIX: Record<string, string> = {
    'role': 'role:',
    'aggregate': 'agg:',
    'value-object': 'vo:',
    'repository': 'repo:',
    'domain-service': 'svc:',
    'domain-event': 'evt:',
  }
  // target_kind: business-entity 主动跳过——业务实体不在本图中
  function nodeIdFor(target: string, targetKind?: string): string | null {
    if (targetKind === 'business-entity') return null
    if (targetKind && TARGET_KIND_PREFIX[targetKind]) {
      const id = TARGET_KIND_PREFIX[targetKind] + target
      return g.hasNode(id) ? id : null
    }
    for (const pref of ['role:', 'agg:', 'vo:', 'repo:', 'svc:', 'evt:']) {
      if (g.hasNode(pref + target)) return pref + target
    }
    return null
  }

  function pushEdges(srcId: string, rels?: import('../types').Relationship[]) {
    if (!rels || !g.hasNode(srcId)) return
    for (const r of rels) {
      // 跳过跨层映射（implements business-entity）—— 不画进本图
      if (r.kind === 'implements' && r.target_kind === 'business-entity') continue
      const tgt = nodeIdFor(r.target || '', r.target_kind)
      if (!tgt) continue
      let type: EdgeType
      switch (r.kind) {
        case 'depends-on': type = 'depends'; break
        case 'implements': type = 'implements'; break
        case 'composition': type = 'composition'; break
        case 'associates':
        default: type = 'associates'; break
      }
      edges.push({ from: srcId, to: tgt, type })
    }
  }

  // Repository → Aggregate（manages，特殊视觉）
  for (const r of repos) {
    const aggName = repositoryAggregateOf(r.relationships)
    if (aggName && g.hasNode(`agg:${aggName}`)) edges.push({ from: `repo:${r.name}`, to: `agg:${aggName}`, type: 'manages' })
    // Repository 其他关系
    pushEdges(`repo:${r.name}`, (r.relationships || []).filter(x => !(x.kind === 'composition' && x.target_kind === 'aggregate')))
  }

  // Aggregate 自身的关系 + 内嵌部件
  for (const a of aggs) {
    const aggId = `agg:${a.name}`
    pushEdges(aggId, a.relationships)
    for (const e of (a.entities || [])) {
      if (e.name && e.name !== a.root && g.hasNode(`inner-entity:${a.name}:${e.name}`)) {
        edges.push({ from: aggId, to: `inner-entity:${a.name}:${e.name}`, type: 'composition' })
        pushEdges(`inner-entity:${a.name}:${e.name}`, e.relationships)
      } else if (e.name && e.name === a.root) {
        // root entity 的 relationships 视为 aggregate 的关系
        pushEdges(aggId, e.relationships)
      }
    }
    for (const v of (a.value_objects || [])) {
      if (v.name && g.hasNode(`inner-vo:${a.name}:${v.name}`)) {
        edges.push({ from: aggId, to: `inner-vo:${a.name}:${v.name}`, type: 'composition' })
        pushEdges(`inner-vo:${a.name}:${v.name}`, v.relationships)
      }
    }
  }

  // 顶层 VO / Service / Event / Role
  for (const v of vos) pushEdges(`vo:${v.name}`, v.relationships)
  for (const s of svcs) pushEdges(`svc:${s.name}`, s.relationships)
  for (const e of evts) pushEdges(`evt:${e.name}`, e.relationships)
  for (const r of roles) pushEdges(`role:${r.name}`, r.relationships)

  for (const e of edges) g.setEdge(e.from, e.to, { type: e.type } as EdgeData)

  dagre.layout(g)

  const graphInfo = g.graph()
  const svgW = (graphInfo.width || 800) + 60
  const svgH = (graphInfo.height || 400) + 60

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto mb-6">
      <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.role.bg, borderColor: STYLE.role.stroke, borderStyle: 'dashed' }} />Role</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.aggregate.bg, borderColor: STYLE.aggregate.stroke }} />Aggregate (root)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE['inner-entity'].bg, borderColor: STYLE['inner-entity'].stroke }} />聚合内实体</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE['inner-vo'].bg, borderColor: STYLE['inner-vo'].stroke }} />聚合内 VO</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.vo.bg, borderColor: STYLE.vo.stroke }} />Value Object</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.repository.bg, borderColor: STYLE.repository.stroke }} />Repository</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.service.bg, borderColor: STYLE.service.stroke }} />Domain Service</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: STYLE.event.bg, borderColor: STYLE.event.stroke }} />Domain Event</span>
      </div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto" style={{ minWidth: svgW }}>
        <defs>
          <marker id="ad-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
          <marker id="ad-realize" markerWidth="14" markerHeight="12" refX="14" refY="6" orient="auto">
            <polygon points="0 0, 14 6, 0 12" fill="white" stroke="#475569" strokeWidth="1.2" />
          </marker>
          <marker id="ad-diamond-empty" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto">
            <polygon points="0 5, 7 0, 14 5, 7 10" fill="white" stroke="#475569" strokeWidth="1.2" />
          </marker>
          <marker id="ad-diamond-filled" markerWidth="14" markerHeight="10" refX="0" refY="5" orient="auto-start-reverse">
            <polygon points="0 5, 7 0, 14 5, 7 10" fill="#7c3aed" />
          </marker>
        </defs>

        {/* Edges */}
        {g.edges().map((e, i) => {
          const ed = g.edge(e) as { points?: { x: number; y: number }[]; type?: EdgeData['type'] }
          const points = ed.points
          if (!points || points.length < 2) return null
          const d = points.map((p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')
          let stroke = '#94a3b8', dash = '', markerEnd = 'url(#ad-arrow)'
          if (ed.type === 'implements') { stroke = '#475569'; dash = '4 4'; markerEnd = 'url(#ad-realize)' }
          if (ed.type === 'manages') { dash = ''; markerEnd = 'url(#ad-diamond-empty)' }
          if (ed.type === 'composition') { stroke = '#7c3aed'; dash = ''; markerEnd = 'url(#ad-diamond-filled)' }
          if (ed.type === 'depends') { stroke = '#64748b'; dash = '5 3' }
          if (ed.type === 'associates') { stroke = '#64748b'; dash = '' }
          return (
            <path key={`edge-${i}`} d={d} fill="none" stroke={stroke} strokeWidth={1.2}
              strokeDasharray={dash} markerEnd={markerEnd} />
          )
        })}

        {/* Nodes */}
        {g.nodes().map(id => {
          const nd = g.node(id) as NodeData & { x: number; y: number }
          if (!nd) return null
          const s = STYLE[nd.kind]
          const w = nd.width || NW
          const h = nd.height || NH
          return (
            <g key={id}>
              <rect
                x={nd.x - w / 2} y={nd.y - h / 2} width={w} height={h}
                rx={6} ry={6}
                fill={s.bg} stroke={s.stroke} strokeWidth={1.6}
                strokeDasharray={s.dashed ? '5 3' : ''}
              />
              <text x={nd.x} y={nd.y - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b">
                {nd.label}
              </text>
              <text x={nd.x} y={nd.y + 14} textAnchor="middle" fontSize={9} fill={s.stroke} fontWeight={500}>
                «{s.label}»
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
