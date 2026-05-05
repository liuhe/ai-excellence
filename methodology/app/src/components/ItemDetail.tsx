import React from 'react'
import type { Model, Relationship } from '../types'
import { n, na } from '../types'
import { Card, Badge, DocsSection } from './UI'
import { SystemUseCaseDiagram, AppUseCaseDiagram, SystemDetailDiagram, AppDetailDiagram } from './UseCaseDiagram'
import { Link } from './ModelLink'
import { StateMachineDiagram } from './StateMachineDiagram'
import { EntityRelDiagram } from './EntityRelDiagram'
import { MD } from './MD'
import { AppDomainDiagram } from './AppDomainDiagram'
import { businessEntityOf, rolesOf, repositoryAggregateOf, targetsOf, gatherBusinessModelRelationships } from '../relationships'

// 业务模型层用：实体扮演的角色 = relationships 里 kind=implements 且 target_kind=business-entity 的目标
//（业务模型内部的 Role 也是 business-model entity，不是 application Role）
function rolesOfFromBusinessEntity(rels?: Relationship[]): string[] {
  return targetsOf(rels, 'implements', 'business-entity')
}

interface Props {
  model: Model
  selectedId: string
  onNavigate: (id: string) => void
}

const APP_TYPE_COLORS: Record<string, string> = {
  frontend: 'blue', client: 'teal', backend: 'green', proxy: 'amber', external: 'purple',
}

export function ItemDetail({ model, selectedId, onNavigate }: Props) {
  const biz = model.business
  const sys = model.system
  const workers = na(biz, 'business_workers', '业务工人') as string[]
  const extParties = (biz.external_parties || biz.外部参与方 || [])
  const systems = (biz.systems || biz.系统 || [])
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const apps = (sys.applications || sys.子系统 || [])

  const [type, ...indexParts] = selectedId.split(':')
  const idx = indexParts.length > 0 ? parseInt(indexParts[0]) : -1
  const idx2 = indexParts.length > 1 ? parseInt(indexParts[1]) : -1

  switch (type) {
    case 'root':
    case 'org-relations': {
      const org = n(biz, 'organization', '组织')
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {type === 'root' ? '🏢' : '🔲'} {type === 'root' ? org : '组织关系'}
          </h2>
          <OrgBoundaryDiagram org={org} workers={workers} systems={systems} extParties={extParties} model={model} onNavigate={onNavigate} />
        </div>
      )
    }

    case 'org': {
      const org = n(biz, 'organization', '组织')
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🏢 {org}</h2>
          {workers.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">业务工人</h3>
              <div className="space-y-1">
                {workers.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span>🧑‍💼</span><Link name={w} model={model} onNavigate={onNavigate} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          {systems.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">系统</h3>
              <div className="space-y-1">
                {systems.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span>⚙️</span>
                    <Link name={n(s, 'name', '名称')} model={model} onNavigate={onNavigate} />
                    <span className="text-xs text-slate-400">({(s.use_cases || s.用例 || []).length} 用例)</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )
    }

    case 'workers':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🧑‍💼 业务工人</h2>
          <p className="text-slate-600">组织内部执行业务的角色</p>
          <Card>
            {workers.map((w, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                <Link name={w} model={model} onNavigate={onNavigate} />
              </div>
            ))}
          </Card>
        </div>
      )

    case 'ext-party': {
      const party = extParties[idx]
      if (!party) return <Empty />
      const partyName = n(party, 'name', '名称')
      const partyType = (party.type || party.类型 || '')
      const isSystem = partyType === 'system' || partyType === '系统'
      const participants = (party.participants || party.参与者 || [])
      const ucs = (party.use_cases || party.用例 || [])
      // Collect all participant names to find related use cases
      const allNames = isSystem ? [partyName] : participants.map(p => n(p, 'name', '名称'))
      const relatedBUCs = businessUCs.filter(buc => allNames.includes(n(buc, 'actor', '执行者')))
      const relatedSysUCs = systems.flatMap(s =>
        (s.use_cases || s.用例 || []).filter(uc => allNames.includes(n(uc, 'actor', '执行者')))
      )
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isSystem ? '🖥️' : '👥'} {partyName}
          </h2>
          {isSystem && <Badge color="purple">系统</Badge>}
          {participants.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">参与者</h3>
              {participants.map((p, i) => {
                const pType = (p.type || p.类型 || '')
                const pIcon = pType === 'person' || pType === '人' ? '👤'
                  : pType === 'device' || pType === '设备' ? '📱' : '🖥️'
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <span>{pIcon}</span>
                    <Link name={n(p, 'name', '名称')} model={model} onNavigate={onNavigate} />
                    <span className="text-xs text-slate-400">{pType}</span>
                  </div>
                )
              })}
            </Card>
          )}
          {ucs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">用例</h3>
              {ucs.map((uc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0 flex items-center gap-2">
                  <span className="text-slate-400">→</span>
                  <span className="font-medium text-slate-700">{n(uc, 'name', '名称')}</span>
                  <span className="text-xs text-slate-400">({n(uc, 'actor', '执行者')})</span>
                </div>
              ))}
            </Card>
          )}
          {relatedBUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">参与的业务用例</h3>
              {relatedBUCs.map((buc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0">
                  <Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
          {relatedSysUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">触发的系统用例</h3>
              {relatedSysUCs.map((uc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0 flex items-center gap-2">
                  <Link name={n(uc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
        </div>
      )
    }

    case 'participant': {
      const party = extParties[idx]
      if (!party) return <Empty />
      const participants = (party.participants || party.参与者 || [])
      const participant = participants[idx2]
      if (!participant) return <Empty />
      const pName = n(participant, 'name', '名称')
      const pType = (participant.type || participant.类型 || '')
      const pIcon = pType === 'person' || pType === '人' ? '👤'
        : pType === 'device' || pType === '设备' ? '📱' : '🖥️'
      const relatedBUCs = businessUCs.filter(buc => n(buc, 'actor', '执行者') === pName)
      const relatedSysUCs = systems.flatMap(s =>
        (s.use_cases || s.用例 || []).filter(uc => n(uc, 'actor', '执行者') === pName)
      )
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">{pIcon} {pName}</h2>
          <div className="flex gap-2">
            <Badge color="gray">{pType}</Badge>
            <Badge color="slate"><Link name={n(party, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
          </div>
          {relatedBUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">参与的业务用例</h3>
              {relatedBUCs.map((buc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0">
                  <Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
          {relatedSysUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">触发的系统用例</h3>
              {relatedSysUCs.map((uc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0 flex items-center gap-2">
                  <Link name={n(uc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                  {(uc.entry || uc.入口) && (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      入口: {n(uc, 'entry', '入口')}
                    </span>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      )
    }

    case 'worker': {
      const worker = workers[idx]
      if (!worker) return <Empty />
      const relatedUCs = systems.flatMap(s =>
        (s.use_cases || s.用例 || []).filter(uc => n(uc, 'actor', '执行者') === worker)
      )
      const relatedBUCs = businessUCs.filter(buc => n(buc, 'actor', '执行者') === worker)
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🧑‍💼 {worker}</h2>
          <Badge color="amber">业务工人</Badge>
          <p className="text-slate-600">组织内部执行业务的角色</p>
          {relatedBUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">参与的业务用例</h3>
              {relatedBUCs.map((buc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0">
                  <Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
          {relatedUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">触发的系统用例</h3>
              {relatedUCs.map((uc, i) => (
                <div key={i} className="py-1.5 border-b border-slate-50 last:border-0 flex items-center gap-2">
                  <Link name={n(uc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
        </div>
      )
    }

    case 'system': {
      const system = systems[idx]
      if (!system) return <Empty />
      const ucs = (system.use_cases || system.用例 || [])
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">⚙️ {n(system, 'name', '名称')}</h2>
          <SystemDetailDiagram model={model} systemIndex={idx} />
          {(() => {
            const sysGrouped = new Map<string, { uc: typeof ucs[0]; idx: number }[]>()
            ucs.forEach((uc, j) => {
              const pkg = uc.package || uc.分组 || ''
              if (!sysGrouped.has(pkg)) sysGrouped.set(pkg, [])
              sysGrouped.get(pkg)!.push({ uc, idx: j })
            })
            const sysHasPkgs = sysGrouped.size > 1 || (sysGrouped.size === 1 && !sysGrouped.has(''))

            const renderTable = (items: { uc: typeof ucs[0]; idx: number }[]) => (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-1.5 pr-3">用例</th>
                    <th className="py-1.5 pr-3">执行者</th>
                    <th className="py-1.5">入口</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ uc, idx: i }) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 pr-3"><Link name={n(uc, 'name', '名称')} model={model} onNavigate={onNavigate} /></td>
                      <td className="py-2 pr-3 text-slate-600"><Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></td>
                      <td className="py-2 text-slate-500 font-mono text-xs">
                        {(uc.entry || uc.入口) ? <Link name={n(uc, 'entry', '入口')} model={model} onNavigate={onNavigate} /> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )

            if (!sysHasPkgs) {
              return (
                <Card>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">系统用例 ({ucs.length})</h3>
                  {renderTable(ucs.map((uc, i) => ({ uc, idx: i })))}
                </Card>
              )
            }

            return (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase">系统用例 ({ucs.length})</h3>
                {Array.from(sysGrouped.entries()).map(([pkg, items]) => (
                  <div key={pkg || '__ungrouped__'} className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-indigo-400 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100">
                      <span className="text-sm font-semibold text-indigo-700">{pkg || 'Other'}</span>
                      <span className="text-xs text-indigo-400 ml-2">({items.length})</span>
                    </div>
                    <div className="p-3">
                      {renderTable(items)}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )
    }

    case 'system-uc': {
      const system = systems[idx]
      if (!system) return <Empty />
      const ucs = (system.use_cases || system.用例 || [])
      const uc = ucs[idx2]
      if (!uc) return <Empty />
      const entry = n(uc, 'entry', '入口')
      const ucName = n(uc, 'name', '名称')
      const relatedBUCs = businessUCs.filter(buc =>
        (buc.system_use_cases || buc.系统用例 || []).includes(ucName)
      )
      const appUCMap = buildAppUCMap(apps)

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">◎ {ucName}</h2>
          <div className="flex gap-2">
            <Badge color="blue">系统用例</Badge>
            <Badge color="gray"><Link name={n(system, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
          </div>
          <Card>
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">执行者</h3>
                <p className="text-slate-700"><Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></p>
              </div>
            </div>
          </Card>
          {relatedBUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">所属业务用例</h3>
              {relatedBUCs.map((buc, i) => (
                <div key={i} className="py-1.5 flex items-center gap-2">
                  <span>🎯</span>
                  <Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} />
                </div>
              ))}
            </Card>
          )}
          {entry && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">
                <button className="hover:text-blue-600 cursor-pointer" onClick={() => onNavigate(`suc-trace:${idx}:${idx2}`)}>
                  用例链路 ↳
                </button>
              </h3>
              <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-2">
                <AppUCTree entryKey={entry} appUCMap={appUCMap} model={model} onNavigate={onNavigate} />
              </div>
            </Card>
          )}
        </div>
      )
    }

    case 'business-uc': {
      const buc = businessUCs[idx]
      if (!buc) return <Empty />
      const sysUCNames = (buc.system_use_cases || buc.系统用例 || [])
      const interests = (buc.stakeholder_interests || buc.相关方利益 || [])
      const appUCMap = buildAppUCMap(apps)
      const sysUCDetails = sysUCNames.map(sucName => {
        for (const s of systems) {
          const uc = (s.use_cases || s.用例 || []).find(u => n(u, 'name', '名称') === sucName)
          if (uc) return { name: sucName, actor: n(uc, 'actor', '执行者'), entry: n(uc, 'entry', '入口') }
        }
        return { name: sucName, actor: '', entry: '' }
      })

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🎯 {n(buc, 'name', '名称')}</h2>
          <Badge color="blue"><Link name={n(buc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></Badge>
          {interests.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">相关方利益</h3>
              <div className="space-y-3">
                {interests.map((si, i) => (
                  <div key={i} className="bg-slate-50 rounded p-3 border border-slate-100">
                    <div className="font-semibold text-slate-700 mb-1"><Link name={n(si, 'stakeholder', '相关方')} model={model} onNavigate={onNavigate} /></div>
                    <div className="text-slate-600 text-sm">{n(si, 'interest', '利益')}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <SystemUseCaseDiagram model={model} bucIndex={idx} />
          <AppUseCaseDiagram model={model} bucIndex={idx} />
          {sysUCDetails.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">
                <button className="hover:text-blue-600 cursor-pointer" onClick={() => onNavigate(`trace:${idx}`)}>
                  关联系统用例 ↳
                </button>
              </h3>
              <div className="space-y-3">
                {sysUCDetails.map((suc, j) => (
                  <div key={j}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-medium text-blue-700"><Link name={suc.name} model={model} onNavigate={onNavigate} /></span>
                      {suc.actor && <span className="text-xs text-slate-400">(<Link name={suc.actor} model={model} onNavigate={onNavigate} />)</span>}
                    </div>
                    {suc.entry && (
                      <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-2">
                        <AppUCTree entryKey={suc.entry} appUCMap={appUCMap} model={model} onNavigate={onNavigate} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <DocsSection docs={(buc.docs || buc.扩展文档 || [])} />
        </div>
      )
    }

    case 'data-model': {
      const dm = dataModels[idx]
      if (!dm) return <Empty />
      const fields = (dm.fields || dm.字段 || [])
      const notes = n(dm, 'notes', '备注')
      const sm = dm.state_machine || dm.状态机
      const allRels = gatherBusinessModelRelationships(dataModels)
      const dmName = n(dm, 'name', '名称')
      const relatedRels = allRels.filter(r => r.from === dmName || r.to === dmName)
      const crossRefs = dataModels
        .flatMap(other => (other.fields || other.字段 || []).map(f => {
          const entry = Object.entries(f)[0]
          return entry ? { model: n(other, 'name', '名称'), field: entry[0], desc: entry[1] } : null
        }))
        .filter((f): f is NonNullable<typeof f> =>
          f !== null && f.desc.includes(n(dm, 'name', '名称')) && f.model !== n(dm, 'name', '名称')
        )

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">▪ {n(dm, 'name', '名称')}</h2>
          <div className="flex gap-2 items-center flex-wrap">
            {(dm.table_name || dm.表名) && (
              <span className="font-mono text-sm text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {n(dm, 'table_name', '表名')}
              </span>
            )}
            {dm.archetype && <Badge color={dm.archetype === 'role' ? 'amber' : dm.archetype === 'moment-interval' ? 'pink' : dm.archetype === 'party-place-thing' ? 'green' : 'blue'}>{dm.archetype}</Badge>}
            {(() => { const roles = rolesOf(dm.relationships).concat(rolesOfFromBusinessEntity(dm.relationships)); return roles.length > 0 ? (<><span className="text-xs text-slate-500">实现:</span>{roles.map((r, j) => <Badge key={j} color="amber"><Link name={r} model={model} onNavigate={onNavigate} /></Badge>)}</>) : null })()}
          </div>
          <Card>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">字段</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-1 pr-4">字段名</th>
                  <th className="py-1">描述</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => {
                  const entry = Object.entries(f)[0]
                  if (!entry) return null
                  return (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-1.5 pr-4 font-mono text-xs text-blue-700 whitespace-nowrap">{entry[0]}</td>
                      <td className="py-1.5 text-slate-600">{entry[1]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
          {notes && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">备注</h3>
              <p className="text-slate-600 text-sm"><MD basePath={dm._sourceDir || model.basePath}>{notes}</MD></p>
            </Card>
          )}
          {(() => {
            const entityRules = (dm.rules || dm.规则 || [])
            // Reverse: find UC rules that reference this entity
            const ucRulesForEntity: { appName: string; ucName: string; text: string; field?: string; sourceDir?: string }[] = []
            for (const a of apps) {
              const aName = n(a, 'name', '名称')
              for (const uc of (a.use_cases || a.用例 || [])) {
                for (const r of (uc.rules || uc.规则 || [])) {
                  if (typeof r === 'string') continue
                  const entities = (r.related_entities || r.关联实体 || [])
                  for (const ref of entities) {
                    const [eName, eField] = ref.split('.')
                    if (eName === dmName) {
                      ucRulesForEntity.push({
                        appName: aName, ucName: n(uc, 'name', '名称'),
                        text: r.content || r.内容 || '', field: eField,
                        sourceDir: a._sourceDir,
                      })
                    }
                  }
                }
              }
            }
            const allRules = entityRules.length + ucRulesForEntity.length
            return allRules > 0 ? (
              <Card>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">规则 ({allRules})</h3>
                <ul className="space-y-2">
                  {entityRules.map((r, i) => {
                    const text = r.content || r.内容 || ''
                    const field = r.field || r.关联属性
                    const relUCs = (r.related_use_cases || r.关联用例 || [])
                    return (
                      <li key={`own-${i}`} className="text-sm text-slate-600">
                        <div className="flex gap-2">
                          <span className="text-slate-400 flex-shrink-0">•</span>
                          <div>
                            {field && <Badge color="blue">{field}</Badge>}{' '}
                            <MD basePath={dm._sourceDir || model.basePath}>{text}</MD>
                          </div>
                        </div>
                        {relUCs.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-4 mt-1">
                            <span className="text-xs text-slate-400">关联用例:</span>
                            {relUCs.map((uc, j) => (
                              <Badge key={j} color="green"><Link name={uc} model={model} onNavigate={onNavigate} /></Badge>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                  {ucRulesForEntity.map((r, i) => (
                    <li key={`uc-${i}`} className="text-sm text-slate-600">
                      <div className="flex gap-2">
                        <span className="text-green-400 flex-shrink-0">•</span>
                        <div>
                          {r.field && <Badge color="blue">{r.field}</Badge>}{' '}
                          <MD basePath={r.sourceDir || model.basePath}>{r.text}</MD>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-4 mt-1">
                        <span className="text-xs text-slate-400">来自用例:</span>
                        <Badge color="green"><Link name={`${r.appName}.${r.ucName}`} model={model} onNavigate={onNavigate}>{`${r.appName}.${r.ucName}`}</Link></Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null
          })()}
          {sm && <StateMachineDiagram sm={sm} />}
          {sm && <StateMachineCard sm={sm} />}
          {relatedRels.length > 0 && <EntityRelDiagram entityName={dmName} relationships={relatedRels.map(r => ({ from: r.from, to: r.to, type: r.cardinality || (r.kind || ''), via: r.via }))} />}
          {relatedRels.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">关系</h3>
              <div className="space-y-2">
                {relatedRels.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Badge color="blue"><Link name={r.from} model={model} onNavigate={onNavigate} /></Badge>
                    <span className="text-slate-400 text-xs">{r.kind}{r.cardinality ? ` (${r.cardinality})` : ''}</span>
                    <span className="text-slate-400">→</span>
                    <Badge color="blue"><Link name={r.to} model={model} onNavigate={onNavigate} /></Badge>
                    {r.via && <span className="text-xs text-slate-400">(via {r.via})</span>}
                    {r.note && <span className="text-xs text-slate-500 italic">{r.note}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {crossRefs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">被引用</h3>
              {crossRefs.map((ref, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-sm">
                  <Badge color="purple"><Link name={ref.model} model={model} onNavigate={onNavigate} /></Badge>
                  <span className="font-mono text-xs text-slate-600">.{ref.field}</span>
                  <span className="text-xs text-slate-400">— {ref.desc}</span>
                </div>
              ))}
            </Card>
          )}
          <DocsSection docs={(dm.docs || dm.扩展文档 || [])} />
        </div>
      )
    }

    case 'app': {
      const app = apps[idx]
      if (!app) return <Empty />
      const appName = n(app, 'name', '名称')
      const appType = (app.type || app.类型 || 'backend') as string
      const tech = app.tech_stack || app.技术栈
      const ucs = (app.use_cases || app.用例 || [])
      const pages = (app.pages || app.页面 || [])

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">{appName}</h2>
            <Badge color={APP_TYPE_COLORS[appType] || 'gray'}>{appType}</Badge>
          </div>
          <AppDetailDiagram model={model} appIndex={idx} />
          {(() => {
            // Group use cases by package
            const grouped = new Map<string, { uc: typeof ucs[0]; idx: number }[]>()
            ucs.forEach((uc, j) => {
              const pkg = uc.package || uc.分组 || ''
              if (!grouped.has(pkg)) grouped.set(pkg, [])
              grouped.get(pkg)!.push({ uc, idx: j })
            })
            const hasPackages = grouped.size > 1 || (grouped.size === 1 && !grouped.has(''))

            const renderUc = (uc: typeof ucs[0], j: number) => {
              const ucApi = (uc.api || uc.api路径 || [])
              return (
                <div key={j} className="bg-slate-50 rounded p-2 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <Link name={`${n(app, 'name', '名称')}.${n(uc, 'name', '名称')}`} model={model} onNavigate={onNavigate}>{n(uc, 'name', '名称')}</Link>
                    <span className="text-xs text-slate-400"><Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></span>
                  </div>
                  {ucApi.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ucApi.map((p, k) => (
                        <code key={k} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">{p}</code>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            if (!hasPackages) {
              return (
                <Card>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">用例 ({ucs.length})</h3>
                  <div className="space-y-2">
                    {ucs.map((uc, j) => renderUc(uc, j))}
                  </div>
                </Card>
              )
            }

            return (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase">用例 ({ucs.length})</h3>
                {Array.from(grouped.entries()).map(([pkg, items]) => (
                  <div key={pkg || '__ungrouped__'} className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-indigo-400 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100">
                      <span className="text-sm font-semibold text-indigo-700">{pkg || 'Other'}</span>
                      <span className="text-xs text-indigo-400 ml-2">({items.length})</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {items.map(({ uc, idx: j }) => renderUc(uc, j))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
          {pages.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">页面 ({pages.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pages.map((p, j) => (
                  <div key={j} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="font-medium text-blue-800 mb-1"><Link name={n(p, 'name', '名称')} model={model} onNavigate={onNavigate} /></div>
                    <div className="flex flex-wrap gap-1">
                      {(p.related_use_cases || p.关联用例 || []).map((uc, k) => (
                        <span key={k} className="text-xs bg-white text-blue-600 px-1.5 py-0.5 rounded border border-blue-200"><Link name={uc} model={model} onNavigate={onNavigate} /></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {(() => {
            const infra = (app.infrastructure || app.基础设施 || [])
            const INFRA_COLORS: Record<string, string> = {
              database: 'green', cache: 'amber', 'message-queue': 'orange',
              search: 'blue', monitoring: 'purple', 'file-storage': 'cyan',
            }
            return infra.length > 0 ? (
              <Card>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">基础设施 ({infra.length})</h3>
                <div className="space-y-2">
                  {infra.map((item, j) => (
                    <div key={j} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800 text-sm">{n(item, 'name', '名称')}</span>
                        <Badge color={INFRA_COLORS[String(item.type || item.类型 || '')] || 'gray'}>{String(item.type || item.类型 || '')}</Badge>
                      </div>
                      {(item.description || item.描述) && (
                        <p className="text-xs text-slate-500">{item.description || item.描述}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null
          })()}
          {tech && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">技术栈</h3>
              <div className="flex flex-wrap gap-2">
                {(tech.language || tech.语言) && (
                  <span className="text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded">{tech.language || tech.语言}</span>
                )}
                {(tech.frameworks || tech.框架 || []).map((fw, j) => (
                  <span key={j} className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded">{fw}</span>
                ))}
                {(tech.storage || tech.存储) && (
                  <span className="text-sm bg-green-50 text-green-600 px-2 py-1 rounded">{tech.storage || tech.存储}</span>
                )}
                {[tech.middleware || tech.其他中间件 || []].flat().filter(Boolean).map((mw, j) => (
                  <span key={j} className="text-sm bg-purple-50 text-purple-600 px-2 py-1 rounded">{mw}</span>
                ))}
                {(tech.implementation || tech.实现) && (
                  <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded italic">{tech.implementation || tech.实现}</span>
                )}
              </div>
            </Card>
          )}
          <DocsSection docs={(app.docs || app.扩展文档 || [])} />
        </div>
      )
    }

    case 'app-trace': {
      const app = apps[idx]
      if (!app) return <Empty />
      const appName = n(app, 'name', '名称')
      const ucs = (app.use_cases || app.用例 || [])
      const appUCMap = buildAppUCMap(apps)

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">↳ 追溯链路</h2>
          <p className="text-sm text-slate-500">子系统用例依赖链路</p>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-bold text-slate-800"><Link name={appName} model={model} onNavigate={onNavigate} /></h3>
              <Badge color="green">{(app.type || app.类型 || 'backend') as string}</Badge>
            </div>

            <div className="space-y-3">
              {ucs.map((uc, j) => {
                const ucName = n(uc, 'name', '名称')
                const key = `${appName}.${ucName}`
                return (
                  <div key={j}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="font-medium text-green-700">
                        <Link name={key} model={model} onNavigate={onNavigate}>{ucName}</Link>
                      </span>
                      <span className="text-xs text-slate-400">
                        (<Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} />)
                      </span>
                    </div>
                    {(uc.associations || uc.关联 || []).length > 0 && (
                      <div className="ml-4 border-l-2 border-green-100 pl-4 space-y-2">
                        {(uc.associations || uc.关联 || [])
                          .filter((a: any) => (a.relation || a.关系 || 'Include') === 'Include')
                          .map((a: any, k: number) => {
                            const targetApp = String(a.application || a.子系统 || appName)
                            const targetName = n(a, 'name', '名称')
                            const targetKey = `${targetApp}.${targetName}`
                            return (
                              <AppUCTree key={k} entryKey={targetKey} appUCMap={appUCMap} model={model} onNavigate={onNavigate} showRules />
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )
    }

    case 'app-page': {
      const app = apps[idx]
      if (!app) return <Empty />
      const pages = (app.pages || app.页面 || [])
      const page = pages[idx2]
      if (!page) return <Empty />
      const relUCs = (page.related_use_cases || page.关联用例 || [])
      const extLinks = (page.external_links || page.外部链接 || [])
      const mappings = (page.display_mappings || page.显示映射 || [])

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">📄 {n(page, 'name', '名称')}</h2>
          <div className="flex gap-2">
            <Badge color="blue"><Link name={n(app, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">页面</Badge>
          </div>
          {relUCs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">关联用例</h3>
              <div className="flex flex-wrap gap-2">
                {relUCs.map((uc, i) => <Badge key={i} color="blue"><Link name={uc} model={model} onNavigate={onNavigate} /></Badge>)}
              </div>
            </Card>
          )}
          {extLinks.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">外部链接</h3>
              <div className="space-y-1">
                {extLinks.map((link, i) => {
                  const entry = Object.entries(link)[0]
                  if (!entry) return null
                  return (
                    <div key={i} className="text-sm">
                      <span className="text-slate-600">{entry[0]}:</span>{' '}
                      <span className="text-blue-600 font-mono text-xs">{entry[1]}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
          {mappings.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">显示映射</h3>
              <div className="space-y-1">
                {mappings.map((m, i) => {
                  if (typeof m === 'string') return (
                    <div key={i} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{m}</div>
                  )
                  const entry = Object.entries(m)[0]
                  if (!entry) return null
                  return (
                    <div key={i} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      <span className="font-medium text-slate-700">{entry[0]}</span>: {String(entry[1])}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )
    }

    case 'app-uc': {
      const app = apps[idx]
      if (!app) return <Empty />
      const ucs = (app.use_cases || app.用例 || [])
      const uc = ucs[idx2]
      if (!uc) return <Empty />
      const rules = (uc.rules || uc.规则 || [])
      const assocs = (uc.associations || uc.关联 || [])
      const apiPaths = (uc.api || uc.api路径 || [])

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">◦ {n(uc, 'name', '名称')}</h2>
          <div className="flex gap-2">
            <Badge color="green"><Link name={n(app, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">子系统用例</Badge>
          </div>
          <Card>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">执行者</h3>
              <p className="text-slate-700"><Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></p>
            </div>
            {apiPaths.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">API</h3>
                <div className="flex flex-wrap gap-1.5">
                  {apiPaths.map((p, j) => (
                    <code key={j} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 font-mono">{p}</code>
                  ))}
                </div>
              </div>
            )}
          </Card>
          {(() => {
            const appName = n(app, 'name', '名称')
            const ucName = n(uc, 'name', '名称')
            const fullKey = `${appName}.${ucName}`
            // Reverse: find entity rules that reference this UC
            const entityRulesForUC: { entityName: string; text: string; field?: string; sourceDir?: string }[] = []
            for (const dm of dataModels) {
              const eName = n(dm, 'name', '名称')
              for (const r of (dm.rules || dm.规则 || [])) {
                const relUCs = (r.related_use_cases || r.关联用例 || [])
                if (relUCs.includes(fullKey)) {
                  entityRulesForUC.push({
                    entityName: eName,
                    text: r.content || r.内容 || '',
                    field: r.field || r.关联属性,
                    sourceDir: dm._sourceDir,
                  })
                }
              }
            }
            const allCount = rules.length + entityRulesForUC.length
            return allCount > 0 ? (
              <Card>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">规则 ({allCount})</h3>
                <ul className="space-y-2">
                  {rules.map((r, i) => {
                    const isObj = typeof r !== 'string'
                    const text = isObj ? (r.content || r.内容 || '') : r
                    const entities = isObj ? (r.related_entities || r.关联实体 || []) : []
                    return (
                      <li key={`own-${i}`} className="text-sm text-slate-600">
                        <div className="flex gap-2">
                          <span className="text-slate-400 flex-shrink-0">•</span>
                          <MD basePath={app._sourceDir || model.basePath}>{text}</MD>
                        </div>
                        {entities.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-4 mt-1">
                            {entities.map((e, j) => (
                              <Badge key={j} color="purple"><Link name={e.split('.')[0]} model={model} onNavigate={onNavigate}>{e}</Link></Badge>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                  {entityRulesForUC.map((r, i) => (
                    <li key={`ent-${i}`} className="text-sm text-slate-600">
                      <div className="flex gap-2">
                        <span className="text-purple-400 flex-shrink-0">•</span>
                        <div>
                          {r.field && <Badge color="blue">{r.field}</Badge>}{' '}
                          <MD basePath={r.sourceDir || model.basePath}>{r.text}</MD>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-4 mt-1">
                        <span className="text-xs text-slate-400">来自实体:</span>
                        <Badge color="purple"><Link name={r.entityName} model={model} onNavigate={onNavigate} /></Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null
          })()}
          {(() => {
            const appName = n(app, 'name', '名称')
            const ucName = n(uc, 'name', '名称')
            const fullKey = `${appName}.${ucName}`
            // Find system UCs whose entry points here
            const relatedSysUCs: { sysName: string; ucName: string }[] = []
            for (const s of systems) {
              for (const suc of (s.use_cases || s.用例 || [])) {
                if (n(suc, 'entry', '入口') === fullKey) {
                  relatedSysUCs.push({ sysName: n(s, 'name', '名称'), ucName: n(suc, 'name', '名称') })
                }
              }
            }
            // Find other app UCs that Include/Extend this UC
            const callerAppUCs: { appName: string; ucName: string; rel: string }[] = []
            for (const a of apps) {
              const aName = n(a, 'name', '名称')
              for (const auc of (a.use_cases || a.用例 || [])) {
                const aucName = n(auc, 'name', '名称')
                if (aName === appName && aucName === ucName) continue
                for (const assoc of (auc.associations || auc.关联 || [])) {
                  const targetApp = String(assoc.application || assoc.子系统 || aName)
                  const targetName = n(assoc, 'name', '名称')
                  if (targetApp === appName && targetName === ucName) {
                    callerAppUCs.push({ appName: aName, ucName: aucName, rel: String(assoc.relation || assoc.关系 || 'Include') })
                  }
                }
              }
            }
            return (relatedSysUCs.length > 0 || callerAppUCs.length > 0) ? (
              <Card>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">被引用</h3>
                {relatedSysUCs.map((r, i) => (
                  <div key={`sys-${i}`} className="py-1.5 flex items-center gap-2">
                    <span>◎</span>
                    <Link name={r.ucName} model={model} onNavigate={onNavigate} />
                    <Badge color="blue">系统用例</Badge>
                    <Badge color="gray"><Link name={r.sysName} model={model} onNavigate={onNavigate} /></Badge>
                  </div>
                ))}
                {callerAppUCs.map((c, i) => (
                  <div key={`app-${i}`} className="py-1.5 flex items-center gap-2">
                    <span>◦</span>
                    <Link name={`${c.appName}.${c.ucName}`} model={model} onNavigate={onNavigate}>{c.ucName}</Link>
                    <span className="text-xs text-slate-400">«{c.rel}»</span>
                    <Badge color="green"><Link name={c.appName} model={model} onNavigate={onNavigate} /></Badge>
                  </div>
                ))}
              </Card>
            ) : null
          })()}
          {assocs.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">关联</h3>
              <div className="space-y-2">
                {assocs.map((a, i) => {
                  const rel = (a.relation || a.关系 || 'Include')
                  const targetApp = (a.application || a.子系统 || '')
                  const targetName = n(a, 'name', '名称')
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        rel === 'Include' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        «{rel}»
                      </span>
                      {targetApp && <Badge color="green"><Link name={String(targetApp)} model={model} onNavigate={onNavigate} /></Badge>}
                      <Link name={targetApp ? `${targetApp}.${targetName}` : targetName} model={model} onNavigate={onNavigate}>{targetName}</Link>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
          <DocsSection docs={(uc.docs || uc.扩展文档 || [])} />
        </div>
      )
    }

    case 'suc-trace': {
      const system = systems[idx]
      if (!system) return <Empty />
      const ucs = (system.use_cases || system.用例 || [])
      const uc = ucs[idx2]
      if (!uc) return <Empty />
      const entry = n(uc, 'entry', '入口')
      const sucName = n(uc, 'name', '名称')
      const appUCMap = buildAppUCMap(apps)
      const relatedBUCs = businessUCs.filter(buc =>
        (buc.system_use_cases || buc.系统用例 || []).includes(sucName)
      )

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">↳ 追溯链路</h2>
          <p className="text-sm text-slate-500">系统用例 → 子系统用例</p>

          <Card>
            {/* Related business UCs */}
            {relatedBUCs.length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-slate-400 uppercase font-semibold">所属业务用例: </span>
                {relatedBUCs.map((buc, i) => (
                  <Badge key={i} color="red"><Link name={n(buc, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
                ))}
              </div>
            )}

            {/* System UC header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-medium text-blue-700"><Link name={sucName} model={model} onNavigate={onNavigate} /></span>
              <span className="text-xs text-slate-400">(<Link name={n(uc, 'actor', '执行者')} model={model} onNavigate={onNavigate} />)</span>
            </div>

            {/* Nested app UC Include tree with rules */}
            {entry && (
              <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-2">
                <AppUCTree entryKey={entry} appUCMap={appUCMap} model={model} onNavigate={onNavigate} showRules />
              </div>
            )}
          </Card>
        </div>
      )
    }

    case 'trace': {
      const buc = businessUCs[idx]
      if (!buc) return <Empty />
      const bucName = n(buc, 'name', '名称')
      const sysUCNames = (buc.system_use_cases || buc.系统用例 || [])
      const sysUCDetails = sysUCNames.map(sucName => {
        for (const s of systems) {
          const uc = (s.use_cases || s.用例 || []).find(u => n(u, 'name', '名称') === sucName)
          if (uc) return { name: sucName, actor: n(uc, 'actor', '执行者'), entry: n(uc, 'entry', '入口') }
        }
        return { name: sucName, actor: '', entry: '' }
      })
      const appUCMap = buildAppUCMap(apps)

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">↳ 追溯链路</h2>
          <p className="text-sm text-slate-500">业务用例 → 系统用例 → 子系统用例 → 页面</p>

          <Card>
            {/* Business UC header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <h3 className="font-bold text-slate-800"><Link name={bucName} model={model} onNavigate={onNavigate} /></h3>
              <Badge color="blue"><Link name={n(buc, 'actor', '执行者')} model={model} onNavigate={onNavigate} /></Badge>
            </div>

            {/* System UCs with nested Include chains */}
            <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-3">
              {sysUCDetails.map((suc, j) => (
                <div key={j}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 -ml-[1.3rem]" />
                    <span className="font-medium text-blue-700"><Link name={suc.name} model={model} onNavigate={onNavigate} /></span>
                    {suc.actor && <span className="text-xs text-slate-400">(<Link name={suc.actor} model={model} onNavigate={onNavigate} />)</span>}
                  </div>

                  {/* Nested app UC Include tree with rules */}
                  {suc.entry && (
                    <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-2">
                      <AppUCTree entryKey={suc.entry} appUCMap={appUCMap} model={model} onNavigate={onNavigate} showRules />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )
    }

    case 'app-domain': {
      const app = apps[idx]
      if (!app) return <Empty />
      const dm = app.domain_model
      if (!dm) return <Empty />
      const aName = n(app, 'name', '名称')
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🧱 {aName} · 应用领域模型</h2>
          <p className="text-sm text-slate-500">本 app 的 DDD 构造块（角色 / 聚合 / VO / 仓储 / 领域服务 / 领域事件）</p>
          <AppDomainDiagram app={app} />
          {dm.roles && dm.roles.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">角色 / 接口 ({dm.roles.length})</h3>
              <ul className="space-y-1">
                {dm.roles.map((r, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <span>🎭</span>
                    <span className="font-medium text-slate-700">{r.name}</span>
                    {r.methods && r.methods.length > 0 && <span className="text-xs text-slate-500">{r.methods.length} 个方法</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {dm.aggregates && dm.aggregates.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">聚合 ({dm.aggregates.length})</h3>
              <ul className="space-y-1">
                {dm.aggregates.map((a, j) => {
                  const be = businessEntityOf(a.relationships)
                  const roles = rolesOf(a.relationships)
                  return (
                    <li key={j} className="flex items-center gap-2 text-sm flex-wrap">
                      <span>◆</span>
                      <span className="font-medium text-slate-700">{a.name}</span>
                      {be && (<><span className="text-xs text-slate-400">→</span><Badge color="purple"><Link name={be} model={model} onNavigate={onNavigate} /></Badge></>)}
                      {roles.length > 0 && (<><span className="text-xs text-slate-400">扮演:</span>{roles.map((r, k) => <Badge key={k} color="amber">{r}</Badge>)}</>)}
                      {a.root && <span className="text-xs text-slate-500">根: {a.root}</span>}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          {dm.value_objects && dm.value_objects.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">值对象 ({dm.value_objects.length})</h3>
              <ul className="space-y-1">{dm.value_objects.map((v, j) => (<li key={j} className="flex items-center gap-2 text-sm"><span>◇</span><span className="font-medium text-slate-700">{v.name}</span></li>))}</ul>
            </Card>
          )}
          {dm.repositories && dm.repositories.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">仓储 ({dm.repositories.length})</h3>
              <ul className="space-y-1">{dm.repositories.map((r, j) => {
                const agg = repositoryAggregateOf(r.relationships)
                return (<li key={j} className="flex items-center gap-2 text-sm"><span>🗄️</span><span className="font-medium text-slate-700">{r.name}</span>{agg && <span className="text-xs text-slate-500">→ {agg}</span>}</li>)
              })}</ul>
            </Card>
          )}
          {dm.domain_services && dm.domain_services.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">领域服务 ({dm.domain_services.length})</h3>
              <ul className="space-y-1">{dm.domain_services.map((s, j) => (<li key={j} className="flex items-center gap-2 text-sm"><span>⚙</span><span className="font-medium text-slate-700">{s.name}</span></li>))}</ul>
            </Card>
          )}
          {dm.domain_events && dm.domain_events.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">领域事件 ({dm.domain_events.length})</h3>
              <ul className="space-y-1">{dm.domain_events.map((e, j) => (<li key={j} className="flex items-center gap-2 text-sm"><span>⚡</span><span className="font-medium text-slate-700">{e.name}</span>{e.published_when && <span className="text-xs text-slate-500">— {e.published_when}</span>}</li>))}</ul>
            </Card>
          )}
        </div>
      )
    }

    case 'app-agg': {
      const app = apps[idx]
      const agg = app?.domain_model?.aggregates?.[idx2]
      if (!agg) return <Empty />
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">◆ {agg.name}</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">聚合（Aggregate）</Badge>
            {(() => { const be = businessEntityOf(agg.relationships); return be ? (<><span className="text-xs text-slate-500">业务实体:</span><Badge color="purple"><Link name={be} model={model} onNavigate={onNavigate} /></Badge></>) : null })()}
            {(() => { const roles = rolesOf(agg.relationships); return roles.length > 0 ? (<><span className="text-xs text-slate-500">扮演角色:</span>{roles.map((r, j) => <Badge key={j} color="amber">{r}</Badge>)}</>) : null })()}
          </div>
          {agg.root && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">聚合根</h3>
              <p className="text-slate-700">{agg.root}（在下方"实体"列表中定义）</p>
            </Card>
          )}
          {agg.entities && agg.entities.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">实体（含根）</h3>
              {agg.entities.map((e, j) => (
                <div key={j} className="mb-3">
                  <div className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    {e.name === agg.root && <span title="聚合根">★</span>}
                    <span>{e.name}</span>
                    {e.name === agg.root && <Badge color="purple">root</Badge>}
                  </div>
                  {e.fields && e.fields.length > 0 && <FieldsTable fields={e.fields} />}
                </div>
              ))}
            </Card>
          )}
          {agg.value_objects && agg.value_objects.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">内含值对象</h3>
              {agg.value_objects.map((v, j) => (
                <div key={j} className="mb-3">
                  <div className="font-semibold text-slate-700 text-sm">{v.name}</div>
                  {v.fields && v.fields.length > 0 && <FieldsTable fields={v.fields} />}
                </div>
              ))}
            </Card>
          )}
          {agg.invariants && agg.invariants.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">不变量</h3>
              <ul className="space-y-1">{agg.invariants.map((inv, j) => (<li key={j} className="text-sm text-slate-600 flex gap-2"><span>•</span><MD basePath={app!._sourceDir || model.basePath}>{inv}</MD></li>))}</ul>
            </Card>
          )}
          {agg.notes && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">备注</h3>
              <p className="text-slate-600 text-sm"><MD basePath={app!._sourceDir || model.basePath}>{agg.notes}</MD></p>
            </Card>
          )}
        </div>
      )
    }

    case 'app-vo': {
      const app = apps[idx]
      const vo = app?.domain_model?.value_objects?.[idx2]
      if (!vo) return <Empty />
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">◇ {vo.name}</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">值对象（Value Object）</Badge>
            {(() => { const roles = rolesOf(vo.relationships); return roles.length > 0 ? (<><span className="text-xs text-slate-500">扮演角色:</span>{roles.map((r, j) => <Badge key={j} color="amber">{r}</Badge>)}</>) : null })()}
          </div>
          {vo.fields && vo.fields.length > 0 && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">字段</h3><FieldsTable fields={vo.fields} /></Card>)}
        </div>
      )
    }

    case 'app-role': {
      const app = apps[idx]
      const role = app?.domain_model?.roles?.[idx2]
      if (!role) return <Empty />
      // who implements this role within the app?
      const implementers: { kind: string; name: string }[] = []
      const dm = app?.domain_model
      const roleName = role.name || ''
      if (dm) {
        for (const agg of (dm.aggregates || [])) {
          if (rolesOf(agg.relationships).includes(roleName)) implementers.push({ kind: '聚合', name: agg.name || '' })
          for (const e of (agg.entities || [])) if (rolesOf(e.relationships).includes(roleName)) implementers.push({ kind: '实体', name: `${agg.name}.${e.name}` })
          for (const v of (agg.value_objects || [])) if (rolesOf(v.relationships).includes(roleName)) implementers.push({ kind: '聚合内 VO', name: `${agg.name}.${v.name}` })
        }
        for (const v of (dm.value_objects || [])) {
          if (rolesOf(v.relationships).includes(roleName)) implementers.push({ kind: 'VO', name: v.name || '' })
        }
        for (const s of (dm.domain_services || [])) {
          if (rolesOf(s.relationships).includes(roleName)) implementers.push({ kind: '领域服务', name: s.name || '' })
        }
      }
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🎭 {role.name}</h2>
          <div className="flex gap-2"><Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge><Badge color="amber">角色 / 接口</Badge></div>
          {role.methods && role.methods.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">方法</h3>
              <ul className="space-y-1">{role.methods.map((m, j) => (<li key={j} className="text-sm font-mono text-slate-700 flex gap-2"><span>•</span>{m}</li>))}</ul>
            </Card>
          )}
          {role.notes && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">备注</h3><p className="text-sm text-slate-600"><MD basePath={app!._sourceDir || model.basePath}>{role.notes}</MD></p></Card>)}
          {implementers.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">本 app 内的实现者 ({implementers.length})</h3>
              <ul className="space-y-1">{implementers.map((it, j) => (<li key={j} className="text-sm text-slate-700 flex gap-2"><span className="text-xs text-slate-400">{it.kind}:</span>{it.name}</li>))}</ul>
            </Card>
          )}
        </div>
      )
    }

    case 'app-repo': {
      const app = apps[idx]
      const repo = app?.domain_model?.repositories?.[idx2]
      if (!repo) return <Empty />
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">🗄️ {repo.name}</h2>
          <div className="flex gap-2"><Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge><Badge color="gray">仓储（Repository）</Badge>{(() => { const agg = repositoryAggregateOf(repo.relationships); return agg ? (<><span className="text-xs text-slate-500">聚合:</span><Badge color="purple">{agg}</Badge></>) : null })()}</div>
          {repo.operations && repo.operations.length > 0 && (
            <Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">操作</h3>
              <ul className="space-y-1">{repo.operations.map((op, j) => (<li key={j} className="text-sm font-mono text-slate-700 flex gap-2"><span>•</span>{op}</li>))}</ul>
            </Card>
          )}
        </div>
      )
    }

    case 'app-svc': {
      const app = apps[idx]
      const svc = app?.domain_model?.domain_services?.[idx2]
      if (!svc) return <Empty />
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">⚙ {svc.name}</h2>
          <div className="flex gap-2"><Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge><Badge color="gray">领域服务（Domain Service）</Badge></div>
          {svc.operations && svc.operations.length > 0 && (
            <Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">操作</h3>
              <ul className="space-y-1">{svc.operations.map((op, j) => (<li key={j} className="text-sm font-mono text-slate-700 flex gap-2"><span>•</span>{op}</li>))}</ul>
            </Card>
          )}
          {svc.notes && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">备注</h3><p className="text-sm text-slate-600"><MD basePath={app!._sourceDir || model.basePath}>{svc.notes}</MD></p></Card>)}
        </div>
      )
    }

    case 'app-evt': {
      const app = apps[idx]
      const evt = app?.domain_model?.domain_events?.[idx2]
      if (!evt) return <Empty />
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">⚡ {evt.name}</h2>
          <div className="flex gap-2"><Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge><Badge color="gray">领域事件（Domain Event）</Badge></div>
          {evt.published_when && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">何时发布</h3><p className="text-sm text-slate-700">{evt.published_when}</p></Card>)}
          {evt.payload && evt.payload.length > 0 && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">载荷</h3><FieldsTable fields={evt.payload} /></Card>)}
        </div>
      )
    }

    case 'app-agg-entity': {
      const idx3 = indexParts.length > 2 ? parseInt(indexParts[2]) : -1
      const app = apps[idx]
      const agg = app?.domain_model?.aggregates?.[idx2]
      const entity = agg?.entities?.[idx3]
      if (!entity) return <Empty />
      const isRoot = entity.name === agg!.root
      const roles = rolesOf(entity.relationships)
      const be = businessEntityOf(entity.relationships)
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">{isRoot ? '★' : '▪'} {entity.name}</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="purple"><Link name={agg!.name || ''} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">{isRoot ? '聚合根（Aggregate Root）' : '聚合内实体'}</Badge>
            {be && (<><span className="text-xs text-slate-500">业务实体:</span><Badge color="purple"><Link name={be} model={model} onNavigate={onNavigate} /></Badge></>)}
            {roles.length > 0 && (<><span className="text-xs text-slate-500">扮演角色:</span>{roles.map((r, k) => <Badge key={k} color="amber">{r}</Badge>)}</>)}
          </div>
          {entity.fields && entity.fields.length > 0 && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">字段</h3><FieldsTable fields={entity.fields} /></Card>)}
        </div>
      )
    }

    case 'app-agg-vo': {
      const idx3 = indexParts.length > 2 ? parseInt(indexParts[2]) : -1
      const app = apps[idx]
      const agg = app?.domain_model?.aggregates?.[idx2]
      const vo = agg?.value_objects?.[idx3]
      if (!vo) return <Empty />
      const roles = rolesOf(vo.relationships)
      const be = businessEntityOf(vo.relationships)
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">◇ {vo.name}</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge color="green"><Link name={n(app!, 'name', '名称')} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="purple"><Link name={agg!.name || ''} model={model} onNavigate={onNavigate} /></Badge>
            <Badge color="gray">聚合内值对象</Badge>
            {be && (<><span className="text-xs text-slate-500">业务实体:</span><Badge color="purple"><Link name={be} model={model} onNavigate={onNavigate} /></Badge></>)}
            {roles.length > 0 && (<><span className="text-xs text-slate-500">扮演角色:</span>{roles.map((r, k) => <Badge key={k} color="amber">{r}</Badge>)}</>)}
          </div>
          {vo.fields && vo.fields.length > 0 && (<Card><h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">字段</h3><FieldsTable fields={vo.fields} /></Card>)}
        </div>
      )
    }

    default:
      return <Empty />
  }
}

// 内部辅助组件
function FieldsTable({ fields }: { fields: Record<string, string>[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
        <th className="py-1 pr-4">字段名</th><th className="py-1">描述</th>
      </tr></thead>
      <tbody>
        {fields.map((f, i) => {
          const entry = Object.entries(f)[0]
          if (!entry) return null
          return (<tr key={i} className="border-b border-slate-50">
            <td className="py-1.5 pr-4 font-mono text-xs text-blue-700 whitespace-nowrap">{entry[0]}</td>
            <td className="py-1.5 text-slate-600">{entry[1]}</td>
          </tr>)
        })}
      </tbody>
    </table>
  )
}

// --- Helper components ---

function Empty() {
  return (
    <Card>
      <p className="text-slate-500 text-center py-8">选择左侧树中的节点查看详情</p>
    </Card>
  )
}

function OrgBoundaryDiagram({ org, workers, systems, extParties, model, onNavigate }: {
  org: string
  workers: string[]
  systems: NonNullable<Model['business']['systems']>
  extParties: NonNullable<Model['business']['external_parties']>
  model: Model
  onNavigate: (id: string) => void
}) {
  return (
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
              {isSystem && <div className="text-xs text-purple-500">系统</div>}
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
      {/* Center: Organization */}
      <div className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50 relative">
        <div className="absolute -top-3 left-4 bg-slate-50 px-2 text-sm font-bold text-slate-600"><Link name={org} model={model} onNavigate={onNavigate} /></div>
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
        {systems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">系统</h4>
            <div className="space-y-2">
              {systems.map((s, i) => (
                <div key={i} className="border border-slate-300 rounded-lg p-3 bg-white flex items-center gap-2">
                  <span>⚙️</span>
                  <span className="font-semibold text-slate-700 text-sm"><Link name={n(s, 'name', '名称')} model={model} onNavigate={onNavigate} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StateMachineCard({ sm }: { sm: NonNullable<Model['system']['data_models']>[0]['state_machine'] }) {
  const states = (sm?.states || sm?.状态 || []) as string[]
  const transitions = (sm?.transitions || sm?.转换 || [])
  return (
    <Card>
      <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
        状态机 ({n(sm, 'field', '字段')})
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {states.map((s, i) => (
          <span key={i} className="px-3 py-1 bg-amber-50 rounded-full text-sm font-medium border border-amber-200 text-amber-800">
            {s}
          </span>
        ))}
      </div>
      {transitions.map((t: any, i: number) => (
        <div key={i} className="text-sm flex items-center gap-2 py-1">
          <span className="font-mono bg-amber-50 px-2 py-0.5 rounded text-amber-700">{t.from}</span>
          <span className="text-amber-400">→</span>
          <span className="font-mono bg-amber-50 px-2 py-0.5 rounded text-amber-700">{t.to}</span>
          <span className="text-slate-500 ml-1">{t.trigger}</span>
        </div>
      ))}
      {n(sm, 'notes', '备注') && (
        <p className="text-xs text-amber-600 mt-2 italic">{n(sm, 'notes', '备注')}</p>
      )}
    </Card>
  )
}

type AppUCInfo = { app: string; name: string; rules: string[]; assocs: { rel: string; app: string; name: string }[] }

function buildAppUCMap(apps: Model['system']['applications']): Map<string, AppUCInfo> {
  const map = new Map<string, AppUCInfo>()
  for (const appItem of (apps || [])) {
    const appName = n(appItem, 'name', '名称')
    for (const uc of (appItem.use_cases || appItem.用例 || [])) {
      const ucName = n(uc, 'name', '名称')
      const assocs = (uc.associations || uc.关联 || []).map((a: any) => ({
        rel: String(a.relation || a.关系 || 'Include'),
        app: String(a.application || a.子系统 || ''),
        name: n(a, 'name', '名称'),
      }))
      map.set(`${appName}.${ucName}`, {
        app: appName, name: ucName,
        rules: (uc.rules || uc.规则 || []).map((r: any) => typeof r === 'string' ? r : (r.content || r.内容 || '')),
        assocs,
      })
    }
  }
  return map
}

function AppUCTree({ entryKey, appUCMap, model, onNavigate, showRules }: {
  entryKey: string
  appUCMap: Map<string, AppUCInfo>
  model: Model
  onNavigate: (id: string) => void
  showRules?: boolean
}) {
  function renderNode(key: string, visited: Set<string>): React.ReactNode {
    if (visited.has(key)) return null
    visited.add(key)
    const auc = appUCMap.get(key)
    if (!auc) return null
    const children = auc.assocs
      .filter(a => a.rel === 'Include')
      .map(a => a.app ? `${a.app}.${a.name}` : `${auc.app}.${a.name}`)

    return (
      <div key={key}>
        <div className="bg-slate-50 rounded p-2.5 border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 -ml-[1.55rem]" />
            <Badge color="green"><Link name={auc.app} model={model} onNavigate={onNavigate} /></Badge>
            <Link name={`${auc.app}.${auc.name}`} model={model} onNavigate={onNavigate}>{auc.name}</Link>
          </div>
          {showRules && auc.rules.length > 0 && (
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
            {children.map(ck => renderNode(ck, visited))}
          </div>
        )}
      </div>
    )
  }

  return <>{renderNode(entryKey, new Set())}</>
}

