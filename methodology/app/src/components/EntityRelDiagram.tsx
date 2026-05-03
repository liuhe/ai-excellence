import dagre from 'dagre'

interface Rel {
  from: string
  to: string
  type: string
  via?: string
}

interface Props {
  entityName: string
  relationships: Rel[]
}

export function EntityRelDiagram({ entityName, relationships }: Props) {
  if (relationships.length === 0) return null

  const entities = new Set<string>()
  entities.add(entityName)
  relationships.forEach(r => {
    entities.add(r.from)
    entities.add(r.to)
  })

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 60, marginx: 40, marginy: 30, edgesep: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 130
  const nodeH = 36

  entities.forEach(name => {
    g.setNode(name, { label: name, width: nodeW, height: nodeH })
  })

  relationships.forEach(r => {
    if (g.hasNode(r.from) && g.hasNode(r.to)) {
      g.setEdge(r.from, r.to, { label: r.type, via: r.via || '' })
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">关系图</h3>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="er-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null

          // Shorten end
          const lastPt = points[points.length - 1]
          const prevPt = points[points.length - 2]
          const dx = lastPt.x - prevPt.x
          const dy = lastPt.y - prevPt.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const shrink = halfH + 3
          const endX = dist > 0 ? lastPt.x - (dx / dist) * shrink : lastPt.x
          const endY = dist > 0 ? lastPt.y - (dy / dist) * shrink : lastPt.y
          const adjusted = [...points.slice(0, -1), { x: endX, y: endY }]

          // Shorten start
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

          const midIdx = Math.floor(points.length / 2)
          const midPt = points[midIdx]
          const label = String(edgeData?.label || '')
          const via = String(edgeData?.via || '')
          const fullLabel = via ? `${label}  via ${via}` : label

          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke="#93c5fd" strokeWidth={1.5}
                markerEnd="url(#er-arrow)" />
              {fullLabel && (
                <g>
                  <rect
                    x={midPt.x + 8} y={midPt.y - 8}
                    width={fullLabel.length * 5.8 + 10} height={16}
                    rx={3} fill="white" fillOpacity={0.9}
                  />
                  <text x={midPt.x + 12} y={midPt.y + 4}
                    fontSize={10} fill="#3b82f6">
                    {label}
                  </text>
                  {via && (
                    <text x={midPt.x + 12 + label.length * 6 + 6} y={midPt.y + 4}
                      fontSize={9} fill="#94a3b8" fontStyle="italic">
                      via {via}
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}

        {/* Entity nodes */}
        {Array.from(entities).map(name => {
          const pos = nodePos.get(name)
          if (!pos) return null
          const isCurrent = name === entityName
          return (
            <g key={name}>
              <rect
                x={pos.x - halfW} y={pos.y - halfH}
                width={nodeW} height={nodeH}
                rx={8} ry={8}
                fill={isCurrent ? '#dbeafe' : '#f8fafc'}
                stroke={isCurrent ? '#3b82f6' : '#cbd5e1'}
                strokeWidth={isCurrent ? 2.5 : 1.5}
              />
              <text x={pos.x} y={pos.y + 5} textAnchor="middle"
                fontSize={13} fill={isCurrent ? '#1d4ed8' : '#475569'} fontWeight={isCurrent ? 700 : 500}>
                {name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
