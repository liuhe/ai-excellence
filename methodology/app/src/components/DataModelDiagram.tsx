import dagre from 'dagre'
import { n } from '../types'
import type { Model } from '../types'
import { gatherBusinessModelRelationships } from '../relationships'

interface Props {
  model: Model
}

export function DataModelDiagram({ model }: Props) {
  const sys = model.system
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const relationships = gatherBusinessModelRelationships(dataModels)

  if (dataModels.length === 0) return null

  // 优先用 YAML 的 diagram 字段指向的 AI 生成 SVG，无则 fallback dagre 自动布局
  if (sys.businessModelDiagram) {
    return (
      <div className="border rounded bg-white p-4 mb-6 flex items-center justify-center">
        <img src={sys.businessModelDiagram} alt="Business model ER diagram" className="max-w-full h-auto" />
      </div>
    )
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 140
  const nodeH = 40

  // Add entity nodes (skip empty/null names — they confuse dagre)
  const validNames = new Set<string>()
  dataModels.forEach(dm => {
    const name = n(dm, 'name', '名称')
    if (!name) return
    if (validNames.has(name)) return // dedup
    validNames.add(name)
    g.setNode(name, { label: name, width: nodeW, height: nodeH })
  })

  // Add relationship edges (skip if endpoints not declared)
  relationships.forEach(r => {
    const from = r.from
    const to = r.to
    if (!from || !to) return
    // Only render entity-to-entity relations on ER diagram (skip implements to roles etc., they go to other layer)
    if (r.target_kind && r.target_kind !== 'business-entity') return
    if (g.hasNode(from) && g.hasNode(to)) {
      const relType = r.cardinality || ''
      const via = r.via || ''
      // Map kind to legacy 'relation' style for renderer (dashed/diamond for composition, solid for associates/depends-on)
      const relation = r.kind === 'composition' ? 'composition' : 'association'
      g.setEdge(from, to, { label: relType, via, relation })
    }
  })

  try {
    dagre.layout(g)
  } catch (err) {
    console.error('[DataModelDiagram] dagre.layout failed', err, {
      nodes: g.nodes(),
      edges: g.edges(),
      dataModelsLen: dataModels.length,
      relationshipsLen: relationships.length,
    })
    return (
      <div className="bg-amber-50 border border-amber-300 rounded p-4 text-sm text-amber-900">
        数据模型图渲染失败：{err instanceof Error ? err.message : String(err)}（详情见控制台）
      </div>
    )
  }

  // Extract positions
  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 600) + 60
  const svgHeight = (graphInfo.height || 400) + 60

  // 4-color modeling palette (Peter Coad). Default = neutral slate when archetype absent.
  const ARCHETYPE_COLORS: Record<string, string> = {
    'moment-interval': '#ec4899',     // pink
    'role': '#eab308',                // yellow
    'party-place-thing': '#10b981',   // green
    'description': '#3b82f6',         // blue
  }
  const NEUTRAL = '#94a3b8'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="dm-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
          {/* UML composition: filled diamond at the "whole" end (path's start) */}
          <marker id="dm-diamond" markerWidth="14" markerHeight="10" refX="0" refY="5" orient="auto-start-reverse">
            <polygon points="0,5 7,0 14,5 7,10" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null
          const pathParts = points.map((p: { x: number; y: number }, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )
          const midPoint = points[Math.floor(points.length / 2)]
          const isComposition = edgeData?.relation === 'composition'
          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke="#94a3b8" strokeWidth={1.2}
                markerEnd="url(#dm-arrow)"
                markerStart={isComposition ? 'url(#dm-diamond)' : undefined} />
              {edgeData?.label && (
                <text x={midPoint.x} y={midPoint.y - 8} textAnchor="middle"
                  fontSize={9} fill="#64748b" fontWeight={500}>
                  {edgeData.label}
                </text>
              )}
              {edgeData?.via && (
                <text x={midPoint.x} y={midPoint.y + 6} textAnchor="middle"
                  fontSize={8} fill="#94a3b8" fontStyle="italic">
                  via {edgeData.via}
                </text>
              )}
            </g>
          )
        })}

        {/* Entity boxes — colored by 4-color archetype if provided, else neutral */}
        {dataModels.map((dm) => {
          const name = n(dm, 'name', '名称')
          const pos = nodePos.get(name)
          if (!pos) return null
          const x = pos.x - pos.w / 2
          const y = pos.y - pos.h / 2
          const archetype = (dm.archetype || '') as string
          const color = ARCHETYPE_COLORS[archetype] || NEUTRAL

          return (
            <g key={name}>
              <rect x={x} y={y} width={pos.w} height={pos.h}
                rx={8} ry={8} fill={color} opacity={0.08} stroke={color} strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 5}
                textAnchor="middle" fontSize={13} fill={color} fontWeight={700}>
                {name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
