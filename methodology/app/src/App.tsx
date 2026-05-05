import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import yaml from 'js-yaml'
import type { Model } from './types'
import { n, na } from './types'
import { ModelTree, type TreeNode } from './components/ModelTree'
import { DetailPanel } from './components/DetailPanel'

function buildTree(model: Model): TreeNode[] {
  const biz = model.business
  const sys = model.system
  const workers = na(biz, 'business_workers', '业务工人') as string[]
  const extParties = (biz.external_parties || biz.外部参与方 || [])
  const systems = (biz.systems || biz.系统 || [])
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const apps = (sys.applications || sys.子系统 || [])

  const org = n(biz, 'organization', '组织')

  return [
    // 1. 业务视图
    {
      id: 'business', label: '业务视图', icon: '🏢', children: [
        // 组织关系
        {
          id: 'org-relations', label: '组织关系', icon: '🔲', children: [
            // 组织（内部）
            {
              id: 'org', label: org, icon: '🏢', children: [
                ...(workers.length > 0 ? [{
                  id: 'workers', label: '业务工人', icon: '🧑‍💼', children:
                    workers.map((w, i) => ({ id: `worker:${i}`, label: w, icon: '•' })),
                }] : []),
                ...systems.map((s, i) => {
                  const sUcs = (s.use_cases || s.用例 || [])
                  const sPkgMap = new Map<string, { uc: typeof sUcs[0]; idx: number }[]>()
                  sUcs.forEach((uc, j) => {
                    const pkg = uc.package || uc.分组 || ''
                    if (!sPkgMap.has(pkg)) sPkgMap.set(pkg, [])
                    sPkgMap.get(pkg)!.push({ uc, idx: j })
                  })
                  const sHasPkgs = sPkgMap.size > 1 || (sPkgMap.size === 1 && !sPkgMap.has(''))
                  const ucNode = (uc: typeof sUcs[0], j: number): TreeNode => ({
                    id: `system-uc:${i}:${j}`, label: n(uc, 'name', '名称'), icon: '◎',
                    children: [
                      { id: `suc-trace:${i}:${j}`, label: '追溯链路', icon: '↳' },
                    ],
                  })
                  return {
                    id: `system:${i}`, label: n(s, 'name', '名称'), icon: '⚙️',
                    children: sHasPkgs
                      ? Array.from(sPkgMap.entries()).map(([pkg, items]) => ({
                          id: `sys-pkg:${i}:${pkg || '__ungrouped__'}`, label: pkg || 'Other', icon: '📦',
                          children: items.map(({ uc, idx }) => ucNode(uc, idx)),
                        }))
                      : sUcs.map((uc, j) => ucNode(uc, j)),
                  }
                }),
              ],
            },
            // 外部参与方
            ...extParties.map((ep, i) => {
              const partyName = n(ep, 'name', '名称')
              const partyType = (ep.type || ep.类型 || '')
              const participants = (ep.participants || ep.参与者 || [])
              const isSystem = partyType === 'system' || partyType === '系统'
              const icon = isSystem ? '🖥️' : '👥'
              return {
                id: `ext-party:${i}`, label: partyName, icon,
                tag: isSystem ? '系统' : undefined,
                children: participants.map((p, j) => {
                  const pType = (p.type || p.类型 || '')
                  const pIcon = pType === 'person' || pType === '人' ? '👤'
                    : pType === 'device' || pType === '设备' ? '📱' : '🖥️'
                  return { id: `participant:${i}:${j}`, label: n(p, 'name', '名称'), icon: pIcon }
                }),
              }
            }),
          ],
        },
        // 业务用例
        {
          id: 'business-ucs', label: '业务用例', icon: '🎯', children:
            businessUCs.map((buc, i) => ({
              id: `business-uc:${i}`, label: n(buc, 'name', '名称'), icon: '•',
              children: [
                { id: `trace:${i}`, label: '追溯链路', icon: '↳' },
              ],
            })),
        },
        // 业务模型（业务实体，原"数据模型"，下沉到业务视图）
        {
          id: 'business-model', label: '业务模型', icon: '📊', children:
            dataModels.map((dm, i) => ({
              id: `data-model:${i}`, label: n(dm, 'name', '名称'), icon: '▪',
              tag: (dm.state_machine || dm.状态机) ? '有状态机' : undefined,
            })),
        },
      ],
    },
    // 2. 应用视图（applications view）
    {
      id: 'applications', label: '应用视图', icon: '🏗️', children:
        apps.map((app, i) => {
          const ucs = (app.use_cases || app.用例 || [])
          const pages = (app.pages || app.页面 || [])
          const dm = app.domain_model
          const hasDomainModel = !!(dm && (dm.roles?.length || dm.aggregates?.length || dm.value_objects?.length || dm.repositories?.length || dm.domain_services?.length || dm.domain_events?.length))
          return {
            id: `app:${i}`, label: n(app, 'name', '名称'), icon: '▸',
            tag: (app.type || app.类型 || '') as string,
            children: [
              { id: `app-trace:${i}`, label: '追溯链路', icon: '↳' },
              ...(hasDomainModel ? [{
                id: `app-domain:${i}`, label: '应用领域模型', icon: '🧱',
                children: [
                  ...(dm!.roles || []).map((r, j) => ({ id: `app-role:${i}:${j}`, label: r.name || '', icon: '🎭' })),
                  ...(dm!.aggregates || []).map((a, j) => {
                    const innerEntities = a.entities || []
                    const innerVOs = a.value_objects || []
                    const aggChildren: TreeNode[] = []
                    innerEntities.forEach((e, k) => aggChildren.push({
                      id: `app-agg-entity:${i}:${j}:${k}`,
                      label: e.name || '',
                      icon: e.name === a.root ? '★' : '▪',
                    }))
                    innerVOs.forEach((v, k) => aggChildren.push({ id: `app-agg-vo:${i}:${j}:${k}`, label: v.name || '', icon: '◇' }))
                    return {
                      id: `app-agg:${i}:${j}`, label: a.name || '', icon: '◆',
                      children: aggChildren.length > 0 ? aggChildren : undefined,
                    }
                  }),
                  ...(dm!.value_objects || []).map((v, j) => ({ id: `app-vo:${i}:${j}`, label: v.name || '', icon: '◇' })),
                  ...(dm!.repositories || []).map((r, j) => ({ id: `app-repo:${i}:${j}`, label: r.name || '', icon: '🗄️' })),
                  ...(dm!.domain_services || []).map((s, j) => ({ id: `app-svc:${i}:${j}`, label: s.name || '', icon: '⚙' })),
                  ...(dm!.domain_events || []).map((e, j) => ({ id: `app-evt:${i}:${j}`, label: e.name || '', icon: '⚡' })),
                ],
              }] : []),
              ...pages.map((p, j) => ({ id: `app-page:${i}:${j}`, label: n(p, 'name', '名称'), icon: '📄' })),
              ...(() => {
                const aPkgMap = new Map<string, { uc: typeof ucs[0]; idx: number }[]>()
                ucs.forEach((uc, j) => {
                  const pkg = uc.package || uc.分组 || ''
                  if (!aPkgMap.has(pkg)) aPkgMap.set(pkg, [])
                  aPkgMap.get(pkg)!.push({ uc, idx: j })
                })
                const aHasPkgs = aPkgMap.size > 1 || (aPkgMap.size === 1 && !aPkgMap.has(''))
                if (aHasPkgs) {
                  return Array.from(aPkgMap.entries()).map(([pkg, items]) => ({
                    id: `app-pkg:${i}:${pkg || '__ungrouped__'}`, label: pkg || 'Other', icon: '📦',
                    children: items.map(({ uc, idx }) => ({ id: `app-uc:${i}:${idx}`, label: n(uc, 'name', '名称'), icon: '◦' })),
                  }))
                }
                return ucs.map((uc, j) => ({ id: `app-uc:${i}:${j}`, label: n(uc, 'name', '名称'), icon: '◦' }))
              })(),
            ],
          }
        }),
    },
  ]
}

// === Multi-file model loading ===

async function fetchYaml(path: string): Promise<Record<string, unknown>> {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`)
  const text = await r.text()
  return (yaml.load(text) as Record<string, unknown>) || {}
}

function resolveDetailPath(base: string, ref: string): string {
  const cleaned = ref.startsWith('./') ? ref.slice(2) : ref
  return `${base}/${cleaned}`
}

async function loadModel(modelName: string): Promise<Model> {
  const base = `/${modelName}`
  const [business, businessModelOverview, applicationsOverview] = await Promise.all([
    fetchYaml(`${base}/business.yaml`),
    fetchYaml(`${base}/business-model.yaml`),
    fetchYaml(`${base}/applications.yaml`),
  ])

  const entities = (businessModelOverview.entities || []) as Array<{ detail?: string; name?: string }>
  const apps = (applicationsOverview.applications || []) as Array<{ detail?: string; name?: string }>

  // Helper：取出 detail 文件的所在目录（带尾斜杠），用作该实体/应用 markdown 字段的相对链接基准
  const detailDir = (detailPath: string): string => {
    const full = resolveDetailPath(base, detailPath)
    return full.replace(/\/[^/]+$/, '/')
  }
  const augment = async (e: { detail?: string }) => {
    if (!e.detail) return e
    const data = await fetchYaml(resolveDetailPath(base, e.detail))
    return { ...data, _sourceDir: detailDir(e.detail) }
  }

  const [entityDetails, appDetails] = await Promise.all([
    Promise.all(entities.map(augment)),
    Promise.all(apps.map(augment)),
  ])

  return {
    basePath: `${base}/`,
    business: business as Model['business'],
    system: {
      data_models: entityDetails as Model['system']['data_models'],
      businessModelDiagram: businessModelOverview.diagram
        ? resolveDetailPath(base, businessModelOverview.diagram as string)
        : undefined,
      overview: (applicationsOverview.application_topology || []) as Model['system']['overview'],
      topologyDiagram: applicationsOverview.diagram
        ? resolveDetailPath(base, applicationsOverview.diagram as string)
        : undefined,
      applications: appDetails as Model['system']['applications'],
    } as Model['system'],
  }
}

function App() {
  const [model, setModel] = useState<Model | null>(null)
  const [selectedId, setSelectedId] = useState<string>(() => {
    const hash = window.location.hash.slice(1)
    return hash || 'business'
  })
  const [modelName, setModelName] = useState('')
  const [publicModels, setPublicModels] = useState<string[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [loadError, setLoadError] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(180, Math.min(600, startW + ev.clientX - startX))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  // Sync selectedId → URL hash (preserve ?model= param)
  useEffect(() => {
    const current = window.location.hash.slice(1)
    if (current !== selectedId) {
      const params = new URLSearchParams(window.location.search)
      const search = params.toString() ? `?${params.toString()}` : ''
      window.history.pushState(null, '', `${window.location.pathname}${search}#${selectedId}`)
    }
  }, [selectedId])

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash) setSelectedId(hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Fetch list of public models
  useEffect(() => {
    fetch('/models.json')
      .then(r => r.json())
      .then((list: string[]) => setPublicModels(list))
      .catch(() => {})
  }, [])

  const loadPublicModel = useCallback(async (name: string, preserveNav = false) => {
    setLoadError(null)
    try {
      const m = await loadModel(name)
      setModel(m)
      setModelName(name)
      const existingHash = window.location.hash.slice(1)
      const navId = preserveNav && existingHash ? existingHash : 'business'
      window.history.replaceState(null, '', `?model=${encodeURIComponent(name)}#${navId}`)
      setSelectedId(navId)
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }, [])

  // Auto-load from ?model= on mount, preserving the hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get('model')
    if (m) loadPublicModel(m, true)
  }, [loadPublicModel])

  const tree = useMemo(() => model ? buildTree(model) : null, [model])

  if (!model || !tree) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="rounded-2xl p-16 text-center max-w-lg w-full bg-white shadow-sm border border-slate-200">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">DCDDP Model Viewer</h1>
          <p className="text-slate-500 mb-6">v6.2 建模查看器（多文件结构）</p>
          {loadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              加载失败: {loadError}
            </div>
          )}
          {publicModels.length > 0 ? (
            <div>
              <p className="text-slate-400 mb-3">选择模型</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {publicModels.map(m => (
                  <button
                    key={m}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition text-sm font-medium"
                    onClick={() => loadPublicModel(m)}
                  >
                    📁 {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-400">未发现可用模型</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">DCDDP Viewer</h1>
          <span className="text-sm text-slate-400 bg-slate-100 px-2 py-0.5 rounded">📁 {modelName}</span>
        </div>
        <button
          onClick={() => { setModel(null); setModelName(''); window.history.replaceState(null, '', window.location.pathname) }}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded hover:bg-slate-100 transition"
        >
          换一个模型
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree */}
        <aside
          ref={sidebarRef}
          className="bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0"
          style={{ width: sidebarWidth }}
        >
          <ModelTree
            roots={tree}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        {/* Resize Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors flex-shrink-0"
          onMouseDown={handleResizeStart}
        />

        {/* Detail Panel */}
        <main className="flex-1 overflow-y-auto" style={{ minWidth: 600 }}>
          <div className="p-6">
            <DetailPanel model={model} selectedId={selectedId} onNavigate={setSelectedId} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
