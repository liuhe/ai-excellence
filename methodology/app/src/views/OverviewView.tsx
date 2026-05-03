import type { Model } from '../types'
import { n } from '../types'
import { Card, Badge } from '../components/UI'

type SubView = 'interaction-graph' | 'interaction-list'

export function OverviewView({ model, subView }: { model: Model; subView: SubView }) {
  const sys = model.system
  const overview = (sys.overview || sys.概览 || [])
  const apps = (sys.applications || sys.子系统 || [])
  const biz = model.business
  const extParties = (biz.external_parties || biz.外部参与方 || [])

  // Collect all nodes
  const appNames = new Set(apps.map(a => n(a, 'name', '名称')))
  const externalNames = new Set<string>()

  // Add workers
  const workers = biz.business_workers || biz.业务工人
  if (workers) {
    const list = Array.isArray(workers) ? workers : [workers]
    list.forEach(w => externalNames.add(w as string))
  }
  // Add external party participants and party names
  extParties.forEach(ep => {
    const partyType = (ep.type || ep.类型 || '')
    const isSystem = partyType === 'system' || partyType === '系统'
    if (isSystem) {
      externalNames.add(n(ep, 'name', '名称'))
    }
    const participants = (ep.participants || ep.参与者 || [])
    participants.forEach(p => externalNames.add(n(p, 'name', '名称')))
  })

  overview.forEach(e => {
    if (!appNames.has(e.from || '')) externalNames.add(e.from || '')
    if (!appNames.has(e.to || '')) externalNames.add(e.to || '')
  })

  if (overview.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">交互总览</h2>
        <Card>
          <p className="text-slate-500 text-center py-8">
            模型中没有定义 overview（交互总览）数据。
            <br />
            <span className="text-sm text-slate-400">
              可在 system.overview 中定义应用间的交互关系。
            </span>
          </p>
        </Card>

        {/* Fallback: show inferred interactions */}
        <InferredInteractions model={model} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">交互总览</h2>

      {/* Node legend */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">内部应用</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(appNames).map(name => (
                <Badge key={name} color="blue">{name}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">外部参与者</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(externalNames).filter(Boolean).map(name => (
                <Badge key={name} color="purple">{name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Interaction Graph */}
      {(subView === 'interaction-graph' || !subView) && (
        <>
          <h3 className="text-lg font-semibold text-slate-700">交互图</h3>
          <div className="space-y-2">
            {overview.map((edge, i) => (
              <Card key={i} compact>
                <div className="flex items-center gap-3">
                  <Badge color={appNames.has(edge.from || '') ? 'blue' : 'purple'}>
                    {edge.from}
                  </Badge>
                  <div className="flex flex-col items-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      edge.type === 'sync'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {edge.type === 'sync' ? '⟿ sync' : '→ call'}
                    </span>
                  </div>
                  <Badge color={appNames.has(edge.to || '') ? 'blue' : 'purple'}>
                    {edge.to}
                  </Badge>
                  <span className="text-sm text-slate-600 ml-2">{edge.label}</span>
                </div>
                {edge.details && edge.details.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-2">
                    {edge.details.map((d, j) => (
                      <span key={j} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Interaction List */}
      {(subView === 'interaction-list' || !subView) && (
        <>
          <h3 className="text-lg font-semibold text-slate-700">交互列表</h3>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 px-3">源</th>
                  <th className="py-2 px-3">目标</th>
                  <th className="py-2 px-3">类型</th>
                  <th className="py-2 px-3">描述</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((edge, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{edge.from}</td>
                    <td className="py-2 px-3 font-medium">{edge.to}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        edge.type === 'sync'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {edge.type === 'sync' ? 'Async' : 'Call'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{edge.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <InferredInteractions model={model} />
    </div>
  )
}

function InferredInteractions({ model }: { model: Model }) {
  const apps = (model.system.applications || model.system.子系统 || [])
  const edges: { from: string; to: string; useCase: string; rel: string }[] = []

  for (const app of apps) {
    const appName = n(app, 'name', '名称')
    for (const uc of (app.use_cases || app.用例 || [])) {
      const ucName = n(uc, 'name', '名称')
      for (const assoc of (uc.associations || uc.关联 || [])) {
        const targetApp = String(assoc.application || assoc.子系统 || '')
        if (targetApp && targetApp !== appName) {
          edges.push({
            from: appName,
            to: targetApp,
            useCase: ucName,
            rel: String(assoc.relation || assoc.关系 || 'Include'),
          })
        }
      }
    }
  }

  if (edges.length === 0) return null

  const grouped = new Map<string, typeof edges>()
  for (const e of edges) {
    const key = `${e.from}→${e.to}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(e)
  }

  return (
    <Card>
      <h4 className="text-sm font-semibold text-slate-600 mb-3">推断的应用交互（从用例关联）</h4>
      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([key, items]) => (
          <div key={key} className="flex items-start gap-3">
            <Badge color="blue">{items[0].from}</Badge>
            <span className="text-slate-400 mt-0.5">→</span>
            <Badge color="blue">{items[0].to}</Badge>
            <div className="flex flex-wrap gap-1">
              {items.map((item, j) => (
                <span key={j} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                  «{item.rel}» {item.useCase}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
