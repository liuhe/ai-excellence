import React, { useMemo } from 'react'
import type { Model } from '../types'
import { n } from '../types'
import { Card, Badge } from '../components/UI'

type SubView = 'trace-chains' | 'orphan-uc'

interface TraceChain {
  businessUC: { name: string; actor: string }
  systemUCs: { name: string; actor: string; entry: string }[]
  appUCs: { app: string; name: string; actor: string; rules: string[]; assocs: { rel: string; app: string; name: string }[] }[]
  pages: { app: string; name: string }[]
}

function buildTraceChains(model: Model): TraceChain[] {
  const biz = model.business
  const sys = model.system
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const systems = (biz.systems || biz.系统 || [])
  const apps = (sys.applications || sys.子系统 || [])

  const systemUCMap = new Map<string, { name: string; actor: string; entry: string }>()
  for (const s of systems) {
    for (const uc of (s.use_cases || s.用例 || [])) {
      const name = n(uc, 'name', '名称')
      systemUCMap.set(name, {
        name,
        actor: n(uc, 'actor', '执行者'),
        entry: n(uc, 'entry', '入口'),
      })
    }
  }

  const appUCMap = new Map<string, { app: string; name: string; actor: string; rules: string[]; assocs: { rel: string; app: string; name: string }[] }>()
  for (const app of apps) {
    const appName = n(app, 'name', '名称')
    for (const uc of (app.use_cases || app.用例 || [])) {
      const ucName = n(uc, 'name', '名称')
      const assocs = (uc.associations || uc.关联 || []).map(a => ({
        rel: String(a.relation || a.关系 || 'Include'),
        app: String(a.application || a.子系统 || ''),
        name: n(a, 'name', '名称'),
      }))
      appUCMap.set(`${appName}.${ucName}`, {
        app: appName,
        name: ucName,
        actor: n(uc, 'actor', '执行者'),
        rules: (uc.rules || uc.规则 || []) as string[],
        assocs,
      })
    }
  }

  const pageLookup = new Map<string, { app: string; name: string }[]>()
  for (const app of apps) {
    const appName = n(app, 'name', '名称')
    for (const page of (app.pages || app.页面 || [])) {
      const pageName = n(page, 'name', '名称')
      const relUCs = (page.related_use_cases || page.关联用例 || [])
      for (const ucName of relUCs) {
        const key = `${appName}.${ucName}`
        if (!pageLookup.has(key)) pageLookup.set(key, [])
        pageLookup.get(key)!.push({ app: appName, name: pageName })
      }
    }
  }

  return businessUCs.map(buc => {
    const bucName = n(buc, 'name', '名称')
    const sysUCNames = (buc.system_use_cases || buc.系统用例 || [])
    const systemUCs = sysUCNames.map(name => systemUCMap.get(name)).filter((x): x is NonNullable<typeof x> => !!x)

    const appUCs: TraceChain['appUCs'] = []
    const visited = new Set<string>()

    function collectAppUCs(key: string) {
      if (visited.has(key)) return
      visited.add(key)
      const auc = appUCMap.get(key)
      if (auc) {
        appUCs.push(auc)
        for (const assoc of auc.assocs) {
          const nextKey = assoc.app ? `${assoc.app}.${assoc.name}` : `${auc.app}.${assoc.name}`
          collectAppUCs(nextKey)
        }
      }
    }

    for (const suc of systemUCs) {
      if (suc.entry) collectAppUCs(suc.entry)
    }

    const pages: TraceChain['pages'] = []
    for (const auc of appUCs) {
      const key = `${auc.app}.${auc.name}`
      const ps = pageLookup.get(key) || []
      pages.push(...ps)
    }

    return {
      businessUC: { name: bucName, actor: n(buc, 'actor', '执行者') },
      systemUCs,
      appUCs,
      pages,
    }
  })
}

export function UseCaseTraceView({ model, subView }: { model: Model; subView: SubView }) {
  const chains = useMemo(() => buildTraceChains(model), [model])
  const apps = (model.system.applications || model.system.子系统 || [])

  return (
    <div className="space-y-6">
      {/* Trace Chains */}
      {(subView === 'trace-chains' || !subView) && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">追溯链路</h2>
          <p className="text-sm text-slate-500 mb-4">
            业务用例 → 系统用例 → 子系统用例 → 页面
          </p>

          {chains.map((chain, i) => (
            <Card key={i} className="mb-4">
              {/* Business UC */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h3 className="font-bold text-slate-800">{chain.businessUC.name}</h3>
                <Badge color="blue">{chain.businessUC.actor}</Badge>
              </div>

              {/* System UCs */}
              <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-3">
                {chain.systemUCs.map((suc, j) => (
                  <div key={j}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 -ml-[1.3rem]" />
                      <span className="font-medium text-blue-700">{suc.name}</span>
                      <span className="text-xs text-slate-400">({suc.actor})</span>
                    </div>

                    {/* App UCs — full Include chain */}
                    <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-2">
                      {suc.entry && (() => {
                        const appUCMap = new Map(chain.appUCs.map(a => [`${a.app}.${a.name}`, a]))

                        function renderChain(key: string, visited: Set<string>): React.ReactNode {
                          if (visited.has(key)) return null
                          visited.add(key)
                          const auc = appUCMap.get(key)
                          if (!auc) return null
                          const children = auc.assocs
                            .filter(a => a.rel === 'Include')
                            .map(a => a.app ? `${a.app}.${a.name}` : `${auc.app}.${a.name}`)

                          return (
                            <div key={key}>
                              <div className="bg-slate-50 rounded p-2 border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 -ml-[1.55rem]" />
                                  <span className="text-sm font-medium text-slate-700">{auc.app}</span>
                                  <span className="text-slate-400">.</span>
                                  <span className="text-sm">{auc.name}</span>
                                </div>
                                {auc.rules.length > 0 && (
                                  <ul className="text-xs text-slate-500 mt-1 ml-4 space-y-0.5">
                                    {auc.rules.slice(0, 2).map((r, l) => (
                                      <li key={l} className="list-disc">{r}</li>
                                    ))}
                                    {auc.rules.length > 2 && (
                                      <li className="text-slate-400">...还有 {auc.rules.length - 2} 条规则</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                              {children.length > 0 && (
                                <div className="ml-4 border-l-2 border-green-100 pl-3 mt-1 space-y-1">
                                  {children.map(ck => renderChain(ck, visited))}
                                </div>
                              )}
                            </div>
                          )
                        }

                        return renderChain(suc.entry, new Set())
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Orphan UCs */}
      {(subView === 'orphan-uc' || !subView) && (() => {
        const allTracedAppUCs = new Set(
          chains.flatMap(c => c.appUCs.map(a => `${a.app}.${a.name}`))
        )
        const orphans = apps.flatMap(app => {
          const appName = n(app, 'name', '名称')
          const ucs = (app.use_cases || app.用例 || [])
          return ucs
            .filter(uc => !allTracedAppUCs.has(`${appName}.${n(uc, 'name', '名称')}`))
            .map(uc => ({ app: appName, name: n(uc, 'name', '名称'), actor: n(uc, 'actor', '执行者') }))
        })

        return orphans.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold text-slate-800">孤立用例</h2>
            <Card className="border-amber-200 bg-amber-50">
              <p className="text-sm text-amber-700 mb-3">以下子系统用例未被业务用例追溯：</p>
              <div className="space-y-2">
                {orphans.map((o, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <Badge color="amber">{o.app}</Badge>
                    <span>{o.name}</span>
                    <span className="text-xs text-slate-400">({o.actor})</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800">孤立用例</h2>
            <Card>
              <p className="text-slate-500 text-center py-4">所有子系统用例都已追溯 ✓</p>
            </Card>
          </>
        )
      })()}
    </div>
  )
}
