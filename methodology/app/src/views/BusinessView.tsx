import type { Model } from '../types'
import { n, na } from '../types'
import { Card, DocsSection } from '../components/UI'
import { UseCaseDiagram } from '../components/UseCaseDiagram'
import { Link } from '../components/ModelLink'

type SubView = 'org-structure' | 'system-uc' | 'business-uc'

export function BusinessView({ model, subView, onNavigate }: { model: Model; subView: SubView; onNavigate: (id: string) => void }) {
  const biz = model.business
  const org = n(biz, 'organization', '组织')
  const workers = na(biz, 'business_workers', '业务工人') as string[]
  const extParties = (biz.external_parties || biz.外部参与方 || [])
  const systems = (biz.systems || biz.系统 || []) as Model['business']['systems']
  const businessUCs = (biz.business_use_cases || biz.业务用例 || []) as Model['business']['business_use_cases']

  return (
    <div className="space-y-6">
      {/* Organization Structure */}
      {(subView === 'org-structure' || !subView) && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">组织结构</h2>
          {/* Organization Boundary Diagram */}
          <div className="flex gap-4 items-stretch">
            {/* Left: External parties */}
            <div className="flex flex-col gap-3 justify-center min-w-[160px]">
              {extParties.map((ep, i) => {
                const partyName = n(ep, 'name', '名称')
                const partyType = (ep.type || ep.类型 || '')
                const isSystem = partyType === 'system' || partyType === '系统'
                const participants = (ep.participants || ep.参与者 || [])
                return (
                  <div key={i} className={`border-2 rounded-xl p-3 text-center ${
                    isSystem ? 'bg-purple-50 border-purple-300' : 'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="text-lg mb-1">{isSystem ? '🖥️' : '👥'}</div>
                    <div className={`text-sm font-medium ${isSystem ? 'text-purple-800' : 'text-blue-800'}`}>
                      <Link name={partyName} model={model} onNavigate={onNavigate} />
                    </div>
                    {isSystem && <div className="text-xs text-purple-500 mt-0.5">系统</div>}
                    {participants.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {participants.map((p, j) => {
                          const pType = (p.type || p.类型 || '')
                          const pIcon = pType === 'person' || pType === '人' ? '👤'
                            : pType === 'device' || pType === '设备' ? '📱' : '🖥️'
                          return (
                            <div key={j} className="text-xs text-blue-600">{pIcon} <Link name={n(p, 'name', '名称')} model={model} onNavigate={onNavigate} /></div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Center: Organization boundary */}
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50 relative">
              <div className="absolute -top-3 left-4 bg-slate-50 px-2 text-sm font-bold text-slate-600">
                <Link name={org} model={model} onNavigate={onNavigate} />
              </div>

              {/* Business workers inside org */}
              {workers.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">业务工人</h4>
                  <div className="flex flex-wrap gap-2">
                    {workers.map((w, i) => (
                      <div key={i} className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-center">
                        <div className="text-sm">🧑‍💼</div>
                        <div className="text-xs font-medium text-amber-800"><Link name={w} model={model} onNavigate={onNavigate} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Systems inside org */}
              {systems && systems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">系统</h4>
                  <div className="space-y-2">
                    {systems.map((sys, i) => (
                      <div key={i} className="border border-slate-300 rounded-lg p-3 bg-white flex items-center gap-2">
                        <span>⚙️</span>
                        <span className="font-semibold text-slate-700 text-sm"><Link name={n(sys, 'name', '名称')} model={model} onNavigate={onNavigate} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Business Use Cases */}
      {(subView === 'business-uc' || !subView) && businessUCs && businessUCs.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">业务用例</h2>
          <UseCaseDiagram model={model} />
          {businessUCs.map((buc, i) => {
            const sysUCs = (buc.system_use_cases || buc.系统用例 || [])
            const interests = (buc.stakeholder_interests || buc.相关方利益 || [])
            return (
              <Card key={i} className="mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800"><Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} /></h3>
                    <span className="text-sm text-slate-500">执行者: <Link name={n(buc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></span>
                  </div>
                </div>

                {sysUCs.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">关联系统用例</h4>
                    <div className="flex flex-wrap gap-1">
                      {sysUCs.map((uc, j) => (
                        <span key={j} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          <Link name={uc} model={model} onNavigate={onNavigate} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {interests.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">相关方利益</h4>
                    <div className="space-y-1">
                      {interests.map((si, j) => (
                        <div key={j} className="text-sm">
                          <span className="font-medium text-slate-600">
                            <Link name={n(si, 'stakeholder', '相关方')} model={model} onNavigate={onNavigate} />:
                          </span>{' '}
                          <span className="text-slate-500">{n(si, 'interest', '利益')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </>
      )}
      <DocsSection docs={(biz.docs || biz.扩展文档 || [])} />
    </div>
  )
}
