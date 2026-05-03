import type { Model } from '../types'
import { n } from '../types'
import { Card, Badge, DocsSection } from '../components/UI'
import { ArchitectureDiagram } from '../components/UseCaseDiagram'

type SubView = 'apps-list' | 'apps-detail' | 'tech-stack'

const TYPE_COLORS: Record<string, string> = {
  frontend: 'blue',
  client: 'teal',
  backend: 'green',
  proxy: 'amber',
  external: 'purple',
}

export function ApplicationsView({ model, subView, onNavigate }: { model: Model; subView: SubView; onNavigate?: (id: string) => void }) {
  const apps = (model.system.applications || model.system.子系统 || [])

  return (
    <div className="space-y-6">
      {/* Architecture Diagram */}
      {!subView && <ArchitectureDiagram model={model} />}

      {/* Apps List */}
      {(subView === 'apps-list' || !subView) && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">应用列表</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {apps.map((app, i) => {
              const appName = n(app, 'name', '名称')
              const appType = (app.type || app.类型 || 'backend') as string
              const useCases = (app.use_cases || app.用例 || [])
              const pages = (app.pages || app.页面 || [])

              return (
                <Card key={i} compact>
                  <div
                    className={onNavigate ? 'cursor-pointer hover:bg-slate-50 -m-3 p-3 rounded-lg transition' : ''}
                    onClick={() => onNavigate?.(`app:${i}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-800">{appName}</h3>
                      <Badge color={TYPE_COLORS[appType] || 'gray'}>{appType}</Badge>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>用例: {useCases.length}</div>
                      {pages.length > 0 && <div>页面: {pages.length}</div>}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Tech Stack Overview */}
      {(subView === 'tech-stack' || !subView) && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">技术栈总览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app, i) => {
              const appName = n(app, 'name', '名称')
              const appType = (app.type || app.类型 || 'backend') as string
              const tech = app.tech_stack || app.技术栈

              return (
                <Card key={i}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-800">{appName}</h4>
                    <Badge color={TYPE_COLORS[appType] || 'gray'}>{appType}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {(tech?.language || tech?.语言) && (
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-semibold">语言</span>
                        <div className="text-slate-700">{tech.language || tech.语言}</div>
                      </div>
                    )}
                    {(tech?.frameworks || tech?.框架 || []).length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-semibold">框架</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(tech?.frameworks || tech?.框架 || []).map((fw, j) => (
                            <Badge key={j} color="blue">{fw}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(tech?.storage || tech?.存储) && (
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-semibold">存储</span>
                        <div className="text-slate-700">{tech.storage || tech.存储}</div>
                      </div>
                    )}
                    {[tech?.middleware || tech?.其他中间件 || []].flat().filter(Boolean).length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-semibold">中间件</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[tech?.middleware || tech?.其他中间件 || []].flat().filter(Boolean).map((mw, j) => (
                            <Badge key={j} color="purple">{mw}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <DocsSection docs={(model.system.docs || model.system.扩展文档 || [])} />
    </div>
  )
}
