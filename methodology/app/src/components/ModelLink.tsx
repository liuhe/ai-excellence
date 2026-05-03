import type { Model } from '../types'
import { n } from '../types'

export function resolveNameToId(name: string, model: Model): string | null {
  const biz = model.business
  const sys = model.system
  const workers = (biz.business_workers || biz.业务工人 || []) as string[]
  const extParties = (biz.external_parties || biz.外部参与方 || [])
  const businessUCs = (biz.business_use_cases || biz.业务用例 || [])
  const dataModels = (sys.data_models || sys.数据模型 || [])
  const apps = (sys.applications || sys.子系统 || [])
  const systems = (biz.systems || biz.系统 || [])

  // Organization
  const org = n(biz, 'organization', '组织')
  if (name === org) return 'org'
  // Worker
  const wi = Array.isArray(workers) ? workers.indexOf(name) : -1
  if (wi >= 0) return `worker:${wi}`
  // External party
  const epi = extParties.findIndex(ep => n(ep, 'name', '名称') === name)
  if (epi >= 0) return `ext-party:${epi}`
  // Participant
  for (let i = 0; i < extParties.length; i++) {
    const parts = (extParties[i].participants || extParties[i].参与者 || [])
    const pi = parts.findIndex(p => n(p, 'name', '名称') === name)
    if (pi >= 0) return `participant:${i}:${pi}`
  }
  // Business UC
  const buci = businessUCs.findIndex(b => n(b, 'name', '名称') === name)
  if (buci >= 0) return `business-uc:${buci}`
  // System UC
  for (let i = 0; i < systems.length; i++) {
    const ucs = (systems[i].use_cases || systems[i].用例 || [])
    const ui = ucs.findIndex(u => n(u, 'name', '名称') === name)
    if (ui >= 0) return `system-uc:${i}:${ui}`
  }
  // System (by name)
  const si = systems.findIndex(s => n(s, 'name', '名称') === name)
  if (si >= 0) return `system:${si}`
  // Data model
  const dmi = dataModels.findIndex(d => n(d, 'name', '名称') === name)
  if (dmi >= 0) return `data-model:${dmi}`
  // App
  const ai = apps.findIndex(a => n(a, 'name', '名称') === name)
  if (ai >= 0) return `app:${ai}`
  // App page (format: appName/pageName)
  if (name.includes('/')) {
    const [appName, pageName] = name.split('/')
    const appIdx = apps.findIndex(a => n(a, 'name', '名称') === appName)
    if (appIdx >= 0) {
      const pages = (apps[appIdx].pages || apps[appIdx].页面 || [])
      const pageIdx = pages.findIndex(p => n(p, 'name', '名称') === pageName)
      if (pageIdx >= 0) return `app-page:${appIdx}:${pageIdx}`
    }
  }
  // App UC (format: appName.ucName)
  if (name.includes('.')) {
    const [appName, ucName] = name.split('.')
    const appIdx = apps.findIndex(a => n(a, 'name', '名称') === appName)
    if (appIdx >= 0) {
      const ucs = (apps[appIdx].use_cases || apps[appIdx].用例 || [])
      const ucIdx = ucs.findIndex(u => n(u, 'name', '名称') === ucName)
      if (ucIdx >= 0) return `app-uc:${appIdx}:${ucIdx}`
    }
  }
  return null
}

export function Link({ name, model, onNavigate, children }: {
  name: string; model: Model; onNavigate: (id: string) => void; children?: React.ReactNode
}) {
  const targetId = resolveNameToId(name, model)
  if (!targetId) return <>{children || name}</>
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onNavigate(targetId) }}
      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
    >
      {children || name}
    </button>
  )
}
