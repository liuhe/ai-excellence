import dagre from 'dagre'
import { n } from '../types'
import type { Model } from '../types'

interface Props {
  model: Model
}

export function DataModelDiagram({ model }: Props) {
  const sys = model.system
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const relationships = (sys.relationships || sys.关系 || [])

  if (dataModels.length === 0) return null

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 140
  const nodeH = 40

  // Add entity nodes
  dataModels.forEach(dm => {
    const name = n(dm, 'name', '名称')
    g.setNode(name, { label: name, width: nodeW, height: nodeH })
  })

  // Add relationship edges
  relationships.forEach(r => {
    const from = String(r.from)
    const to = String(r.to)
    if (g.hasNode(from) && g.hasNode(to)) {
      const relType = String(r.type || '')
      const via = r.via ? String(r.via) : ''
      g.setEdge(from, to, { label: relType, via })
    }
  })

  dagre.layout(g)

  // Extract positions
  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 600) + 60
  const svgHeight = (graphInfo.height || 400) + 60

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="dm-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
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
          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke="#94a3b8" strokeWidth={1.2}
                markerEnd="url(#dm-arrow)" />
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

        {/* Entity boxes */}
        {dataModels.map((dm, i) => {
          const name = n(dm, 'name', '名称')
          const pos = nodePos.get(name)
          if (!pos) return null
          const x = pos.x - pos.w / 2
          const y = pos.y - pos.h / 2
          const color = colors[i % colors.length]

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
