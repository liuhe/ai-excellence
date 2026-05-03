import dagre from 'dagre'
import { n } from '../types'
import type { Model } from '../types'

interface Props {
  model: Model
}

// Stick figure actor
function ActorFigure({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      {/* Head */}
      <circle cx={x} cy={y - 24} r={10} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      {/* Body */}
      <line x1={x} y1={y - 14} x2={x} y2={y + 6} stroke="#3b82f6" strokeWidth={1.5} />
      {/* Arms */}
      <line x1={x - 14} y1={y - 6} x2={x + 14} y2={y - 6} stroke="#3b82f6" strokeWidth={1.5} />
      {/* Legs */}
      <line x1={x} y1={y + 6} x2={x - 12} y2={y + 22} stroke="#3b82f6" strokeWidth={1.5} />
      <line x1={x} y1={y + 6} x2={x + 12} y2={y + 22} stroke="#3b82f6" strokeWidth={1.5} />
      {/* Label */}
      <text x={x} y={y + 40} textAnchor="middle" fontSize={12} fill="#334155" fontWeight={500}>
        {label}
      </text>
    </g>
  )
}

// Use case oval
function UseCaseOval({ cx, cy, label, subLabels }: {
  cx: number; cy: number; label: string; subLabels?: string[]
}) {
  const rx = 120
  const ry = 24
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="#eff6ff" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#1e40af" fontWeight={600}>
        {label}
      </text>
      {subLabels && subLabels.length > 0 && (
        <>
          {subLabels.map((sl, i) => (
            <text key={i} x={cx} y={cy + ry + 14 + i * 14}
              textAnchor="middle" fontSize={10} fill="#64748b">
              ‹{sl}›
            </text>
          ))}
        </>
      )}
    </g>
  )
}

// Diagram for a single business use case → its system use cases
export function SystemUseCaseDiagram({ model, bucIndex }: { model: Model; bucIndex: number }) {
  const biz = model.business
  const org = n(biz, 'organization', '组织')
  const systems = (biz.systems || biz.系统 || [])
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const buc = businessUCs[bucIndex]
  if (!buc) return null

  const bucName = n(buc, 'name', '名称')
  const bucActor = n(buc, 'actor', '执行者')
  const sysUCNames = (buc.system_use_cases || buc.系统用例 || []) as string[]
  if (sysUCNames.length === 0) return null

  // Resolve system use case details
  const sysUCDetails = sysUCNames.map(name => {
    for (const s of systems) {
      const uc = (s.use_cases || s.用例 || []).find(u => n(u, 'name', '名称') === name)
      if (uc) return { name, actor: n(uc, 'actor', '执行者'), entry: n(uc, 'entry', '入口'), system: n(s, 'name', '名称') }
    }
    return { name, actor: '', entry: '', system: '' }
  })

  // Collect unique actors from system use cases + the business UC actor
  const actorSet = new Set<string>()
  actorSet.add(bucActor)
  sysUCDetails.forEach(suc => { if (suc.actor) actorSet.add(suc.actor) })
  const actors = Array.from(actorSet)

  // Layout
  const actorX = 80
  const boundaryLeft = 180
  const boundaryRight = 620
  const ovalCx = (boundaryLeft + boundaryRight) / 2
  const ucSpacing = 70
  const startY = 70
  const boundaryPadding = 40

  // Positions
  const ucPositions = sysUCDetails.map((_, i) => ({
    cx: ovalCx,
    cy: startY + i * ucSpacing,
  }))

  const totalHeight = Math.max((sysUCDetails.length - 1) * ucSpacing, 0)
  const actorSpacing = actors.length > 1 ? totalHeight / (actors.length - 1) : 0
  const actorStartY = actors.length > 1 ? startY : startY + totalHeight / 2
  const actorPositions = actors.map((_, i) => ({
    x: actorX,
    y: actorStartY + i * actorSpacing,
  }))

  const boundaryTop = startY - 40
  const boundaryBottom = startY + totalHeight + boundaryPadding
  const svgHeight = boundaryBottom + 30
  const svgWidth = boundaryRight + 40

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <div className="text-xs text-slate-400 mb-2 text-center">业务用例「{bucName}」的系统用例</div>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        {/* System boundary */}
        <rect
          x={boundaryLeft} y={boundaryTop}
          width={boundaryRight - boundaryLeft}
          height={boundaryBottom - boundaryTop}
          rx={12} ry={12}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text x={boundaryLeft + 12} y={boundaryTop + 18}
          fontSize={13} fill="#475569" fontWeight={600}>
          {sysUCDetails[0]?.system || org}
        </text>

        {/* Connection lines */}
        {sysUCDetails.map((suc, ucIdx) => {
          const actorIdx = actors.indexOf(suc.actor)
          if (actorIdx < 0) return null
          const ap = actorPositions[actorIdx]
          const up = ucPositions[ucIdx]
          return (
            <line key={`line-${ucIdx}`}
              x1={ap.x + 20} y1={ap.y}
              x2={up.cx - 120} y2={up.cy}
              stroke="#93c5fd" strokeWidth={1.2}
            />
          )
        })}

        {/* Actors */}
        {actors.map((actor, i) => (
          <ActorFigure key={i} x={actorPositions[i].x} y={actorPositions[i].y} label={actor} />
        ))}

        {/* System use case ovals */}
        {sysUCDetails.map((suc, i) => (
          <UseCaseOval
            key={i}
            cx={ucPositions[i].cx}
            cy={ucPositions[i].cy}
            label={suc.name}
            subLabels={undefined}
          />
        ))}
      </svg>
    </div>
  )
}

// Diagram for a single business use case → subsystem (application) level use cases
export function AppUseCaseDiagram({ model, bucIndex }: { model: Model; bucIndex: number }) {
  const biz = model.business
  const systems = (biz.systems || biz.系统 || [])
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const apps = (model.system.applications || model.system.子系统 || [])
  const buc = businessUCs[bucIndex]
  if (!buc) return null

  const bucName = n(buc, 'name', '名称')
  const sysUCNames = (buc.system_use_cases || buc.系统用例 || []) as string[]
  if (sysUCNames.length === 0) return null

  // Get entries from system use cases
  const entries: string[] = []
  for (const name of sysUCNames) {
    for (const s of systems) {
      const uc = (s.use_cases || s.用例 || []).find(u => n(u, 'name', '名称') === name)
      if (uc) {
        const entry = n(uc, 'entry', '入口')
        if (entry) entries.push(entry)
      }
    }
  }

  // Walk Include/Extend chains to collect all app UCs and edges
  type AppUC = { app: string; name: string; actor: string }
  type Edge = { from: AppUC; to: AppUC; relation: string }
  const collected = new Map<string, AppUC>()
  const edges: Edge[] = []
  const visited = new Set<string>()

  function walk(key: string) {
    if (visited.has(key)) return
    visited.add(key)
    const [appName, ucName] = key.split('.')
    const app = apps.find(a => n(a, 'name', '名称') === appName)
    if (!app) return
    const ucs = (app.use_cases || app.用例 || [])
    const uc = ucs.find(u => n(u, 'name', '名称') === ucName)
    if (!uc) return
    collected.set(key, { app: appName, name: ucName, actor: n(uc, 'actor', '执行者') })
    for (const a of (uc.associations || uc.关联 || [])) {
      const rel = (a.relation || a.关系 || 'Include')
      const targetApp = String(a.application || a.子系统 || appName)
      const targetName = n(a, 'name', '名称')
      const targetKey = `${targetApp}.${targetName}`
      edges.push({
        from: { app: appName, name: ucName, actor: '' },
        to: { app: targetApp, name: targetName, actor: '' },
        relation: rel,
      })
      walk(targetKey)
    }
  }
  entries.forEach(e => walk(e))

  if (collected.size === 0) return null

  // Collect unique actors from entry use cases
  const actorSet = new Set<string>()
  for (const entryKey of entries) {
    const uc = collected.get(entryKey)
    if (uc && uc.actor) actorSet.add(uc.actor)
  }
  const actors = Array.from(actorSet)

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 60, marginy: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 210
  const nodeH = 44

  // Add actor nodes
  actors.forEach(actor => {
    g.setNode(`actor:${actor}`, { label: actor, width: 120, height: 80 })
  })

  // Add app group (parent) nodes + UC (child) nodes
  const appSet = new Set<string>()
  for (const uc of collected.values()) appSet.add(uc.app)
  for (const appName of appSet) {
    g.setNode(`group:${appName}`, { label: appName, clusterLabelPos: 'top' })
  }
  for (const [key, uc] of collected) {
    g.setNode(key, { label: uc.name, width: nodeW, height: nodeH })
    g.setParent(key, `group:${uc.app}`)
  }

  // Add actor→entry edges
  for (const entryKey of entries) {
    const uc = collected.get(entryKey)
    if (!uc) continue
    const actorId = `actor:${uc.actor}`
    if (g.hasNode(actorId)) {
      g.setEdge(actorId, entryKey)
    }
  }

  // Add Include/Extend edges
  for (const edge of edges) {
    const fromKey = `${edge.from.app}.${edge.from.name}`
    const toKey = `${edge.to.app}.${edge.to.name}`
    if (g.hasNode(fromKey) && g.hasNode(toKey)) {
      g.setEdge(fromKey, toKey, { label: edge.relation })
    }
  }

  dagre.layout(g)

  // Extract positions
  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  // Compute app boundary boxes from their UC node positions
  const appBounds = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>()
  for (const [key, uc] of collected) {
    const pos = nodePos.get(key)
    if (!pos) continue
    const prev = appBounds.get(uc.app)
    const halfW = nodeW / 2 + 15
    const halfH = nodeH / 2 + 15
    if (!prev) {
      appBounds.set(uc.app, { minX: pos.x - halfW, minY: pos.y - halfH, maxX: pos.x + halfW, maxY: pos.y + halfH })
    } else {
      prev.minX = Math.min(prev.minX, pos.x - halfW)
      prev.minY = Math.min(prev.minY, pos.y - halfH)
      prev.maxX = Math.max(prev.maxX, pos.x + halfW)
      prev.maxY = Math.max(prev.maxY, pos.y + halfH)
    }
  }

  // SVG dimensions
  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 800) + 80
  const svgHeight = (graphInfo.height || 400) + 80

  const ovalRx = nodeW / 2
  const ovalRy = nodeH / 2

  // Colors per app
  const appColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
  const appList = Array.from(appSet)
  const appColorMap = new Map<string, string>()
  appList.forEach((a, i) => appColorMap.set(a, appColors[i % appColors.length]))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <div className="text-xs text-slate-400 mb-2 text-center">业务用例「{bucName}」的子系统用例</div>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* App boundary boxes */}
        {Array.from(appBounds.entries()).map(([appName, b]) => {
          const color = appColorMap.get(appName) || '#94a3b8'
          const pad = 10
          return (
            <g key={`app-${appName}`}>
              <rect x={b.minX - pad} y={b.minY - 18} width={b.maxX - b.minX + pad * 2} height={b.maxY - b.minY + 24}
                rx={10} ry={10}
                fill="white" stroke={color} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.8} />
              <text x={b.minX - pad + 10} y={b.minY - 4} fontSize={11} fill={color} fontWeight={700}>
                {appName}
              </text>
            </g>
          )
        })}

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const fp = nodePos.get(e.v)
          const tp = nodePos.get(e.w)
          if (!fp || !tp) return null
          const isActorEdge = e.v.startsWith('actor:')
          // Use dagre edge points if available
          const points = edgeData?.points
          if (points && points.length >= 2) {
            const pathParts = points.map((p: {x: number; y: number}, idx: number) =>
              idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
            )
            const midPoint = points[Math.floor(points.length / 2)]
            return (
              <g key={`edge-${i}`}>
                <path d={pathParts.join(' ')}
                  fill="none"
                  stroke={isActorEdge ? '#93c5fd' : '#94a3b8'}
                  strokeWidth={isActorEdge ? 1.2 : 1}
                  strokeDasharray={isActorEdge ? 'none' : '4 2'}
                  markerEnd={isActorEdge ? undefined : 'url(#arrowhead)'} />
                {!isActorEdge && edgeData?.label && (
                  <text x={midPoint.x} y={midPoint.y - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
                    «{edgeData.label}»
                  </text>
                )}
              </g>
            )
          }
          return null
        })}

        {/* Actors */}
        {actors.map(actor => {
          const pos = nodePos.get(`actor:${actor}`)
          if (!pos) return null
          return <ActorFigure key={actor} x={pos.x} y={pos.y} label={actor} />
        })}

        {/* Use case ovals */}
        {Array.from(collected.entries()).map(([key, uc]) => {
          const pos = nodePos.get(key)
          if (!pos) return null
          const isEntry = entries.includes(key)
          return (
            <g key={key}>
              <ellipse cx={pos.x} cy={pos.y} rx={ovalRx} ry={ovalRy}
                fill={isEntry ? '#dbeafe' : '#f0fdf4'}
                stroke={isEntry ? '#3b82f6' : '#86efac'}
                strokeWidth={isEntry ? 1.5 : 1} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                fontSize={11} fill={isEntry ? '#1e40af' : '#166534'} fontWeight={500}>
                {uc.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Diagram for a system detail page — all use cases of a specific system with actors
export function SystemDetailDiagram({ model, systemIndex }: { model: Model; systemIndex: number }) {
  const biz = model.business
  const systems = (biz.systems || biz.系统 || [])
  const system = systems[systemIndex]
  if (!system) return null

  const systemName = n(system, 'name', '名称')
  const ucs = (system.use_cases || system.用例 || [])
  if (ucs.length === 0) return null

  // Collect unique actors
  const actorSet = new Set<string>()
  ucs.forEach(uc => {
    const actor = n(uc, 'actor', '执行者')
    if (actor) actorSet.add(actor)
  })
  const actors = Array.from(actorSet)

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 40, marginx: 60, marginy: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 220
  const nodeH = 44

  // Actor nodes
  actors.forEach(actor => {
    g.setNode(`actor:${actor}`, { label: actor, width: 120, height: 80 })
  })

  // Group use cases by package
  const sysPkgMap = new Map<string, number[]>()
  ucs.forEach((uc, i) => {
    const pkg = uc.package || uc.分组 || ''
    if (!sysPkgMap.has(pkg)) sysPkgMap.set(pkg, [])
    sysPkgMap.get(pkg)!.push(i)
  })
  const sysHasPackages = sysPkgMap.size > 1 || (sysPkgMap.size === 1 && !sysPkgMap.has(''))

  // System boundary + UC nodes
  g.setNode('sys-boundary', { label: systemName, clusterLabelPos: 'top' })

  if (sysHasPackages) {
    Array.from(sysPkgMap.keys()).forEach(pkg => {
      const pkgId = `pkg:${pkg || '__ungrouped__'}`
      g.setNode(pkgId, { label: pkg || 'Other', clusterLabelPos: 'top' })
      g.setParent(pkgId, 'sys-boundary')
    })
  }

  ucs.forEach((uc, i) => {
    g.setNode(`uc:${i}`, { label: n(uc, 'name', '名称'), width: nodeW, height: nodeH })
    if (sysHasPackages) {
      const pkg = uc.package || uc.分组 || ''
      g.setParent(`uc:${i}`, `pkg:${pkg || '__ungrouped__'}`)
    } else {
      g.setParent(`uc:${i}`, 'sys-boundary')
    }
  })

  // Actor → UC edges
  ucs.forEach((uc, i) => {
    const actorName = n(uc, 'actor', '执行者')
    const actorId = `actor:${actorName}`
    if (g.hasNode(actorId)) {
      g.setEdge(actorId, `uc:${i}`)
    }
  })

  // Association edges (Include/Extend) between system use cases
  const sysAssocEdges: { from: number; to: number; relation: string }[] = []
  const ucNameToIdx = new Map<string, number>()
  ucs.forEach((uc, i) => ucNameToIdx.set(n(uc, 'name', '名称'), i))
  ucs.forEach((uc, i) => {
    const assocs = uc.associations || uc.关联 || []
    assocs.forEach(a => {
      const targetName = a.name || ''
      const targetIdx = ucNameToIdx.get(targetName)
      if (targetIdx !== undefined) {
        g.setEdge(`uc:${i}`, `uc:${targetIdx}`, { label: `«${a.relation || 'Include'}»` })
        sysAssocEdges.push({ from: i, to: targetIdx, relation: a.relation || 'Include' })
      }
    })
  })

  dagre.layout(g)

  // Extract positions
  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  // Compute boundary box from UC positions
  const sysBndPad = sysHasPackages ? 65 : 20
  let bndMinX = Infinity, bndMinY = Infinity, bndMaxX = -Infinity, bndMaxY = -Infinity
  ucs.forEach((_, i) => {
    const pos = nodePos.get(`uc:${i}`)
    if (!pos) return
    bndMinX = Math.min(bndMinX, pos.x - nodeW / 2 - sysBndPad)
    bndMinY = Math.min(bndMinY, pos.y - nodeH / 2 - sysBndPad)
    bndMaxX = Math.max(bndMaxX, pos.x + nodeW / 2 + sysBndPad)
    bndMaxY = Math.max(bndMaxY, pos.y + nodeH / 2 + sysBndPad)
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 800) + 80
  const svgHeight = (graphInfo.height || 400) + 80
  const ovalRx = nodeW / 2
  const ovalRy = nodeH / 2

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="sys-arrow" viewBox="0 0 10 10" refX={10} refY={5}
            markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#6366f1" />
          </marker>
        </defs>
        {/* System boundary */}
        <rect
          x={bndMinX} y={bndMinY}
          width={bndMaxX - bndMinX} height={bndMaxY - bndMinY}
          rx={12} ry={12}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text x={bndMinX + 12} y={bndMinY + 18}
          fontSize={13} fill="#475569" fontWeight={600}>
          {systemName}
        </text>

        {/* Package sub-boundaries */}
        {sysHasPackages && Array.from(sysPkgMap.entries()).map(([pkg, indices]) => {
          const pad = 14
          let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity
          indices.forEach(i => {
            const pos = nodePos.get(`uc:${i}`)
            if (!pos) return
            pMinX = Math.min(pMinX, pos.x - nodeW / 2 - pad)
            pMinY = Math.min(pMinY, pos.y - nodeH / 2 - pad)
            pMaxX = Math.max(pMaxX, pos.x + nodeW / 2 + pad)
            pMaxY = Math.max(pMaxY, pos.y + nodeH / 2 + pad)
          })
          if (pMinX === Infinity) return null
          const labelH = 20
          pMinY -= labelH
          return (
            <g key={`pkg-${pkg || '__ungrouped__'}`}>
              <rect
                x={pMinX} y={pMinY}
                width={pMaxX - pMinX} height={pMaxY - pMinY}
                rx={8} ry={8}
                fill="#eef2ff" fillOpacity={0.5} stroke="#818cf8" strokeWidth={1} strokeDasharray="4 2"
              />
              <text x={pMinX + 8} y={pMinY + 14}
                fontSize={10} fill="#6366f1" fontWeight={600}>
                {pkg || 'Other'}
              </text>
            </g>
          )
        })}

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null
          const isAssoc = e.v.startsWith('uc:') && e.w.startsWith('uc:')
          const pathParts = points.map((p: {x: number; y: number}, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )
          const midPt = points[Math.floor(points.length / 2)]
          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke={isAssoc ? '#6366f1' : '#93c5fd'}
                strokeWidth={1.2}
                strokeDasharray={isAssoc ? '6 3' : undefined}
                markerEnd={isAssoc ? 'url(#sys-arrow)' : undefined} />
              {isAssoc && edgeData.label && (
                <text x={midPt.x} y={midPt.y - 6} textAnchor="middle"
                  fontSize={9} fill="#6366f1" fontStyle="italic">
                  {edgeData.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Actors */}
        {actors.map(actor => {
          const pos = nodePos.get(`actor:${actor}`)
          if (!pos) return null
          return <ActorFigure key={actor} x={pos.x} y={pos.y} label={actor} />
        })}

        {/* Use case ovals */}
        {ucs.map((uc, i) => {
          const pos = nodePos.get(`uc:${i}`)
          if (!pos) return null
          return (
            <g key={i}>
              <ellipse cx={pos.x} cy={pos.y} rx={ovalRx} ry={ovalRy}
                fill="#eff6ff" stroke="#3b82f6" strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                fontSize={12} fill="#1e40af" fontWeight={600}>
                {n(uc, 'name', '名称')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Architecture overview diagram — apps and actors with connections from 概览 data
export function ArchitectureDiagram({ model }: Props) {
  const sys = model.system
  const apps = (sys.applications || sys.子系统 || [])
  const overviewEdges = (sys.overview || sys.概览 || [])
  if (apps.length === 0) return null

  const appNames = new Set(apps.map(a => n(a, 'name', '名称')))

  // Collect all node names (apps + external actors)
  const allNodes = new Set<string>()
  overviewEdges.forEach(e => {
    if (e.from) allNodes.add(e.from)
    if (e.to) allNodes.add(e.to)
  })
  appNames.forEach(name => allNodes.add(name))

  const TYPE_COLORS: Record<string, string> = {
    frontend: '#3b82f6', backend: '#10b981', proxy: '#f59e0b', external: '#8b5cf6',
  }
  const appTypeMap = new Map<string, string>()
  apps.forEach(a => appTypeMap.set(n(a, 'name', '名称'), (a.type || a.类型 || 'backend') as string))

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60, marginx: 50, marginy: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  const appW = 160
  const appH = 50
  const actorW = 100
  const actorH = 80

  allNodes.forEach(name => {
    if (appNames.has(name)) {
      g.setNode(name, { label: name, width: appW, height: appH })
    } else {
      g.setNode(name, { label: name, width: actorW, height: actorH })
    }
  })

  overviewEdges.forEach((e, i) => {
    if (e.from && e.to) {
      g.setEdge(e.from, e.to, { label: e.label || '', id: i, edgeType: e.type || 'call' })
    }
  })

  dagre.layout(g)

  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 800) + 80
  const svgHeight = (graphInfo.height || 400) + 80

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null
          const pathParts = points.map((p: {x: number; y: number}, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )
          const midPoint = points[Math.floor(points.length / 2)]
          const isSync = edgeData?.edgeType === 'sync'
          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none" stroke={isSync ? '#3b82f6' : '#94a3b8'} strokeWidth={1.2}
                strokeDasharray={isSync ? 'none' : '6 3'}
                markerEnd="url(#arch-arrow)" />
              {edgeData?.label && (
                <text x={midPoint.x} y={midPoint.y - 8} textAnchor="middle"
                  fontSize={10} fill="#64748b" fontWeight={500}>
                  {edgeData.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {Array.from(allNodes).map(name => {
          const pos = nodePos.get(name)
          if (!pos) return null
          const isApp = appNames.has(name)

          if (isApp) {
            const appType = appTypeMap.get(name) || 'backend'
            const color = TYPE_COLORS[appType] || '#94a3b8'
            return (
              <g key={name}>
                <rect x={pos.x - appW / 2} y={pos.y - appH / 2}
                  width={appW} height={appH} rx={8} ry={8}
                  fill="white" stroke={color} strokeWidth={2} />
                <text x={pos.x} y={pos.y - 4} textAnchor="middle"
                  fontSize={13} fill="#1e293b" fontWeight={700}>
                  {name}
                </text>
                <text x={pos.x} y={pos.y + 14} textAnchor="middle"
                  fontSize={10} fill={color} fontWeight={500}>
                  {appType}
                </text>
              </g>
            )
          } else {
            // Actor (stick figure)
            return <ActorFigure key={name} x={pos.x} y={pos.y} label={name} />
          }
        })}
      </svg>
    </div>
  )
}

// Use case diagram for a single application detail page
export function AppDetailDiagram({ model, appIndex }: { model: Model; appIndex: number }) {
  const apps = (model.system.applications || model.system.子系统 || [])
  const app = apps[appIndex]
  if (!app) return null

  const appName = n(app, 'name', '名称')
  const ucs = (app.use_cases || app.用例 || [])
  if (ucs.length === 0) return null

  // Collect unique actors
  const actorSet = new Set<string>()
  ucs.forEach(uc => {
    const actor = n(uc, 'actor', '执行者')
    if (actor) actorSet.add(actor)
  })
  const actors = Array.from(actorSet)

  // Collect Include/Extend edges within this app
  type Edge = { from: number; to: number; rel: string }
  const ucNameToIdx = new Map<string, number>()
  ucs.forEach((uc, i) => ucNameToIdx.set(n(uc, 'name', '名称'), i))
  const internalEdges: Edge[] = []
  ucs.forEach((uc, i) => {
    const assocs = (uc.associations || uc.关联 || [])
    assocs.forEach((a: any) => {
      const targetApp = String(a.application || a.子系统 || '')
      const targetName = n(a, 'name', '名称')
      // Only show edges within the same app
      if (!targetApp || targetApp === appName) {
        const targetIdx = ucNameToIdx.get(targetName)
        if (targetIdx !== undefined) {
          internalEdges.push({ from: i, to: targetIdx, rel: String(a.relation || a.关系 || 'Include') })
        }
      }
    })
  })

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 40, marginx: 60, marginy: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 200
  const nodeH = 44

  actors.forEach(actor => {
    g.setNode(`actor:${actor}`, { label: actor, width: 120, height: 80 })
  })

  // Group use cases by package
  const pkgMap = new Map<string, number[]>()
  ucs.forEach((uc, i) => {
    const pkg = uc.package || uc.分组 || ''
    if (!pkgMap.has(pkg)) pkgMap.set(pkg, [])
    pkgMap.get(pkg)!.push(i)
  })
  const hasPackages = pkgMap.size > 1 || (pkgMap.size === 1 && !pkgMap.has(''))

  g.setNode('app-boundary', { label: appName, clusterLabelPos: 'top' })

  if (hasPackages) {
    Array.from(pkgMap.keys()).forEach(pkg => {
      const pkgId = `pkg:${pkg || '__ungrouped__'}`
      g.setNode(pkgId, { label: pkg || 'Other', clusterLabelPos: 'top' })
      g.setParent(pkgId, 'app-boundary')
    })
  }

  ucs.forEach((uc, i) => {
    g.setNode(`uc:${i}`, { label: n(uc, 'name', '名称'), width: nodeW, height: nodeH })
    if (hasPackages) {
      const pkg = uc.package || uc.分组 || ''
      g.setParent(`uc:${i}`, `pkg:${pkg || '__ungrouped__'}`)
    } else {
      g.setParent(`uc:${i}`, 'app-boundary')
    }
  })

  ucs.forEach((uc, i) => {
    const actorName = n(uc, 'actor', '执行者')
    const actorId = `actor:${actorName}`
    if (g.hasNode(actorId)) {
      g.setEdge(actorId, `uc:${i}`)
    }
  })

  internalEdges.forEach(e => {
    g.setEdge(`uc:${e.from}`, `uc:${e.to}`, { label: e.rel })
  })

  dagre.layout(g)

  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  const bndPad = hasPackages ? 65 : 20
  let bndMinX = Infinity, bndMinY = Infinity, bndMaxX = -Infinity, bndMaxY = -Infinity
  ucs.forEach((_, i) => {
    const pos = nodePos.get(`uc:${i}`)
    if (!pos) return
    bndMinX = Math.min(bndMinX, pos.x - nodeW / 2 - bndPad)
    bndMinY = Math.min(bndMinY, pos.y - nodeH / 2 - bndPad)
    bndMaxX = Math.max(bndMaxX, pos.x + nodeW / 2 + bndPad)
    bndMaxY = Math.max(bndMaxY, pos.y + nodeH / 2 + bndPad)
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 800) + 80
  const svgHeight = (graphInfo.height || 400) + 80
  const ovalRx = nodeW / 2
  const ovalRy = nodeH / 2

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        <defs>
          <marker id="app-uc-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* App boundary */}
        <rect
          x={bndMinX} y={bndMinY}
          width={bndMaxX - bndMinX} height={bndMaxY - bndMinY}
          rx={12} ry={12}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text x={bndMinX + 12} y={bndMinY + 18}
          fontSize={13} fill="#475569" fontWeight={600}>
          {appName}
        </text>

        {/* Package sub-boundaries */}
        {hasPackages && Array.from(pkgMap.entries()).map(([pkg, indices]) => {
          const pad = 14
          let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity
          indices.forEach(i => {
            const pos = nodePos.get(`uc:${i}`)
            if (!pos) return
            pMinX = Math.min(pMinX, pos.x - nodeW / 2 - pad)
            pMinY = Math.min(pMinY, pos.y - nodeH / 2 - pad)
            pMaxX = Math.max(pMaxX, pos.x + nodeW / 2 + pad)
            pMaxY = Math.max(pMaxY, pos.y + nodeH / 2 + pad)
          })
          if (pMinX === Infinity) return null
          const labelH = 20
          pMinY -= labelH
          return (
            <g key={`pkg-${pkg || '__ungrouped__'}`}>
              <rect
                x={pMinX} y={pMinY}
                width={pMaxX - pMinX} height={pMaxY - pMinY}
                rx={8} ry={8}
                fill="#eef2ff" fillOpacity={0.5} stroke="#818cf8" strokeWidth={1} strokeDasharray="4 2"
              />
              <text x={pMinX + 8} y={pMinY + 14}
                fontSize={10} fill="#6366f1" fontWeight={600}>
                {pkg || 'Other'}
              </text>
            </g>
          )
        })}

        {/* Edges */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null
          const isActorEdge = e.v.startsWith('actor:')
          const pathParts = points.map((p: {x: number; y: number}, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )
          const midPoint = points[Math.floor(points.length / 2)]
          return (
            <g key={`edge-${i}`}>
              <path d={pathParts.join(' ')}
                fill="none"
                stroke={isActorEdge ? '#93c5fd' : '#94a3b8'}
                strokeWidth={isActorEdge ? 1.2 : 1}
                strokeDasharray={isActorEdge ? 'none' : '4 2'}
                markerEnd={isActorEdge ? undefined : 'url(#app-uc-arrow)'} />
              {!isActorEdge && edgeData?.label && (
                <text x={midPoint.x} y={midPoint.y - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  «{edgeData.label}»
                </text>
              )}
            </g>
          )
        })}

        {/* Actors */}
        {actors.map(actor => {
          const pos = nodePos.get(`actor:${actor}`)
          if (!pos) return null
          return <ActorFigure key={actor} x={pos.x} y={pos.y} label={actor} />
        })}

        {/* Use case ovals */}
        {ucs.map((uc, i) => {
          const pos = nodePos.get(`uc:${i}`)
          if (!pos) return null
          return (
            <g key={i}>
              <ellipse cx={pos.x} cy={pos.y} rx={ovalRx} ry={ovalRy}
                fill="#eff6ff" stroke="#3b82f6" strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                fontSize={11} fill="#1e40af" fontWeight={600}>
                {n(uc, 'name', '名称')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function UseCaseDiagram({ model }: Props) {
  const biz = model.business
  const org = n(biz, 'organization', '组织')
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])

  if (businessUCs.length === 0) return null

  // Collect unique actors
  const actorSet = new Set<string>()
  businessUCs.forEach(buc => {
    const actor = n(buc, 'actor', '执行者')
    if (actor) actorSet.add(actor)
  })
  const actors = Array.from(actorSet)

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50, marginx: 60, marginy: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeW = 240
  const nodeH = 48

  // Actor nodes
  actors.forEach(actor => {
    g.setNode(`actor:${actor}`, { label: actor, width: 120, height: 80 })
  })

  // System boundary group + UC nodes
  g.setNode('system-boundary', { label: org, clusterLabelPos: 'top' })
  businessUCs.forEach((buc, i) => {
    g.setNode(`buc:${i}`, { label: n(buc, 'name', '名称'), width: nodeW, height: nodeH })
    g.setParent(`buc:${i}`, 'system-boundary')
  })

  // Actor → UC edges
  businessUCs.forEach((buc, i) => {
    const actorName = n(buc, 'actor', '执行者')
    const actorId = `actor:${actorName}`
    if (g.hasNode(actorId)) {
      g.setEdge(actorId, `buc:${i}`)
    }
  })

  dagre.layout(g)

  // Extract positions
  const nodePos = new Map<string, { x: number; y: number; w: number; h: number }>()
  g.nodes().forEach(id => {
    const nd = g.node(id)
    if (nd) nodePos.set(id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height })
  })

  // Compute system boundary box from UC positions
  let bndMinX = Infinity, bndMinY = Infinity, bndMaxX = -Infinity, bndMaxY = -Infinity
  businessUCs.forEach((_, i) => {
    const pos = nodePos.get(`buc:${i}`)
    if (!pos) return
    bndMinX = Math.min(bndMinX, pos.x - nodeW / 2 - 20)
    bndMinY = Math.min(bndMinY, pos.y - pos.h / 2 - 20)
    bndMaxX = Math.max(bndMaxX, pos.x + nodeW / 2 + 20)
    bndMaxY = Math.max(bndMaxY, pos.y + pos.h / 2 + 20)
  })

  const graphInfo = g.graph()
  const svgWidth = (graphInfo.width || 800) + 80
  const svgHeight = (graphInfo.height || 400) + 80
  const ovalRx = nodeW / 2
  const ovalRy = nodeH / 2

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto" style={{ minWidth: svgWidth }}>
        {/* System boundary */}
        <rect
          x={bndMinX} y={bndMinY}
          width={bndMaxX - bndMinX} height={bndMaxY - bndMinY}
          rx={12} ry={12}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text x={bndMinX + 12} y={bndMinY + 18}
          fontSize={13} fill="#475569" fontWeight={600}>
          {org}
        </text>

        {/* Edges (dagre routed) */}
        {g.edges().map((e, i) => {
          const edgeData = g.edge(e)
          const points = edgeData?.points
          if (!points || points.length < 2) return null
          const pathParts = points.map((p: {x: number; y: number}, idx: number) =>
            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          )
          return (
            <path key={`edge-${i}`} d={pathParts.join(' ')}
              fill="none" stroke="#93c5fd" strokeWidth={1.2} />
          )
        })}

        {/* Actors */}
        {actors.map(actor => {
          const pos = nodePos.get(`actor:${actor}`)
          if (!pos) return null
          return <ActorFigure key={actor} x={pos.x} y={pos.y} label={actor} />
        })}

        {/* Use case ovals with sub-labels */}
        {businessUCs.map((buc, i) => {
          const pos = nodePos.get(`buc:${i}`)
          if (!pos) return null
          return (
            <g key={i}>
              <ellipse cx={pos.x} cy={pos.y} rx={ovalRx} ry={ovalRy}
                fill="#eff6ff" stroke="#3b82f6" strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                fontSize={12} fill="#1e40af" fontWeight={600}>
                {n(buc, 'name', '名称')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
