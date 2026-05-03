import type { Model } from '../types'
import { BusinessView } from '../views/BusinessView'
import { DataModelsView } from '../views/DataModelsView'
import { ApplicationsView } from '../views/ApplicationsView'
import { ItemDetail } from './ItemDetail'

interface Props {
  model: Model
  selectedId: string
  onNavigate: (id: string) => void
}

export function DetailPanel({ model, selectedId, onNavigate }: Props) {
  switch (selectedId) {
    case 'business':
      return <BusinessView model={model} subView={undefined as any} onNavigate={onNavigate} />
    case 'business-ucs':
      return <BusinessView model={model} subView={'business-uc' as any} onNavigate={onNavigate} />
    case 'business-model':
    case 'data-models':  // legacy — 老的 hash URL 兼容
      return <DataModelsView model={model} subView={undefined as any} onNavigate={onNavigate} />
    case 'applications':
      return <ApplicationsView model={model} subView={undefined as any} onNavigate={onNavigate} />
    default:
      return <ItemDetail model={model} selectedId={selectedId} onNavigate={onNavigate} />
  }
}

