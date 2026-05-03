import type { Model } from '../types'
import { n } from '../types'
import { Card, Badge, DocsSection } from '../components/UI'
import { DataModelDiagram } from '../components/DataModelDiagram'
import { Link } from '../components/ModelLink'

type SubView = 'entities-overview' | 'entity-details' | 'relationships'

export function DataModelsView({ model, subView, onNavigate }: { model: Model; subView: SubView; onNavigate: (id: string) => void }) {
  const sys = model.system
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const relationships = (sys.relationships || sys.关系 || [])

  return (
    <div className="space-y-6">
      {/* Data Model Relationship Diagram */}
      {(!subView || subView === 'entities-overview') && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">数据模型关系图</h2>
          <DataModelDiagram model={model} />
        </>
      )}

      {/* Entities Overview */}
      {(subView === 'entities-overview' || !subView) && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">实体概览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dataModels.map(dm => {
              const name = n(dm, 'name', '名称')
              const fields = (dm.fields || dm.字段 || [])
              return (
                <Card key={name} compact>
                  <div className="font-bold text-slate-800 mb-1"><Link name={name} model={model} onNavigate={onNavigate} /></div>
                  <div className="text-xs text-slate-500">
                    {fields.length} 个字段
                  </div>
                  {(dm.state_machine || dm.状态机) && (
                    <div className="text-xs text-amber-600 mt-1">⚙️ 有状态机</div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Relationships */}
      {(subView === 'relationships' || !subView) && relationships && relationships.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-slate-800">实体关系</h2>
          <Card>
            <div className="space-y-2">
              {relationships.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Badge color="blue"><Link name={String(r.from)} model={model} onNavigate={onNavigate} /></Badge>
                  <span className="text-slate-400 text-xs">{r.type}</span>
                  <span className="text-slate-400">→</span>
                  <Badge color="blue"><Link name={String(r.to)} model={model} onNavigate={onNavigate} /></Badge>
                  {r.via && <span className="text-xs text-slate-400">(via {r.via})</span>}
                  {r.note && <span className="text-xs text-slate-500 italic">{r.note}</span>}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      <DocsSection docs={(sys.docs || sys.扩展文档 || [])} />
    </div>
  )
}
