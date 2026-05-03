import dagre from 'dagre'
import type { Model } from '../types'
import { n } from '../types'

type StateMachine = NonNullable<Model['system']['data_models']>[0]['state_machine']

interface Props {
  sm: StateMachine
}

export function StateMachineDiagram({ sm }: Props) {
  const states = (sm?.states || sm?.状态 || []) as string[]
  const transitions = (sm?.transitions || sm?.转换 || [])
  const field = n(sm, 'field', '字段')

  if (states.length === 0) return null

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 60, marginx: 40, marginy: 30, edgesep: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 110
  const nodeH = 34

  states.forEach(s => {
    g.setNode(s, { label: s, width: nodeW, height: nodeH })
  })

  transitions.forEach(t => {
    const from = String(t.from || '')
    const to = String(t.to || '')
    if (from && to && g.hasNode(from) && g.hasNode(to)) {
      g.setEdge(from, to, { label: t.trigger || '' })
    }
  })

  dagre.layout(g)

  const nodePos = new Map<string, { x: number; y: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y })
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 400) + 60
  const svgHeight = (graphInfo.height || 200) + 40

  const halfW = nodeW / 2
  const halfH = nodeH / 2

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">状态机 ({field})</h3>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="sm-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#d97706" />
          </marker>
        </defs>

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null

          // Shorten end to stop before node border
          const lastPt = points[points.length - 1]
          const prevPt = points.length >= 2 ? points[points.length - 2] : lastPt
          const dx = lastPt.x - prevPt.x
          const dy = lastPt.y - prevPt.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const shrink = halfH + 3
          const endX = dist > 0 ? lastPt.x - (dx / dist) * shrink : lastPt.x
          const endY = dist > 0 ? lastPt.y - (dy / dist) * shrink : lastPt.y
          const adjusted = [...points.slice(0, -1), { x: endX, y: endY }]

          // Also shorten start
          const firstPt = adjusted[0]
          const nextPt = adjusted.length >= 2 ? adjusted[1] : firstPt
          const dx0 = nextPt.x - firstPt.x
          const dy0 = nextPt.y - firstPt.y
          const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0)
          const startX = dist0 > 0 ? firstPt.x + (dx0 / dist0) * (halfH + 1) : firstPt.x
          const startY = dist0 > 0 ? firstPt.y + (dy0 / dist0) * (halfH + 1) : firstPt.y
          adjusted[0] = { x: startX, y: startY }

          const pathParts = adjusted.map((p: { x: number; y: number }, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )

          // Label position: offset to the right of midpoint
          const midIdx = Math.floor(points.length / 2)
          const midPt = points[midIdx]
          const label = String(edgeData?.label || '')

          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke="#d97706" strokeWidth={1.3}
                markerEnd="url(#sm-arrow)" />
              {label && (
                <g>
                  <rect
                    x={midPt.x + 8} y={midPt.y - 8}
                    width={label.length * 6.5 + 8} height={16}
                    rx={3} fill="white" fillOpacity={0.9}
                  />
                  <text x={midPt.x + 12} y={midPt.y + 4}
                    fontSize={10} fill="#92400e">
                    {label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* State nodes */}
        {states.map((s, i) => {
          const pos = nodePos.get(s)
          if (!pos) return null
          const isFirst = i === 0
          return (
            <g key={s}>
              <rect
                x={pos.x - halfW} y={pos.y - halfH}
                width={nodeW} height={nodeH}
                rx={17} ry={17}
                fill={isFirst ? '#fef3c7' : '#fffbeb'}
                stroke={isFirst ? '#d97706' : '#fbbf24'}
                strokeWidth={isFirst ? 2.5 : 1.5}
              />
              <text x={pos.x} y={pos.y + 5} textAnchor="middle"
                fontSize={13} fill="#92400e" fontWeight={600}>
                {s}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
