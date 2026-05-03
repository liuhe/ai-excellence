import type { ReactNode } from 'react'
import type { Doc } from '../types'
import { n } from '../types'

const BADGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${BADGE_COLORS[color] || BADGE_COLORS.gray}`}>
      {children}
    </span>
  )
}

export function Card({
  children,
  className = '',
  compact = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${compact ? 'p-3' : 'p-5'} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}

export function DocsSection({ docs }: { docs: Doc[] }) {
  const hasDocs = docs && docs.length > 0
  const images = hasDocs ? docs.filter(d => (d.type || d.类型) === 'image' || (d.type || d.类型) === '图片') : []
  const articles = hasDocs ? docs.filter(d => (d.type || d.类型) === 'article' || (d.type || d.类型) === '文章') : []
  return (
    <div className="border border-dashed border-slate-200 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
        扩展文档{hasDocs ? ` (${docs.length})` : ''}
      </h3>
      {!hasDocs && (
        <p className="text-xs text-slate-300 italic">在模型文件中添加 docs / 扩展文档 字段，可附加图片或文章</p>
      )}
      {images.map((doc, i) => (
        <div key={`img-${i}`} className="mb-3">
          <p className="text-xs text-slate-500 mb-1">{n(doc, 'name', '名称')}</p>
          <img
            src={n(doc, 'path', '路径')}
            alt={n(doc, 'name', '名称')}
            className="max-w-full rounded border border-slate-200"
          />
        </div>
      ))}
      {articles.length > 0 && (
        <div className="space-y-1">
          {articles.map((doc, i) => (
            <div key={`art-${i}`} className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">📄</span>
              <a
                href={n(doc, 'path', '路径')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {n(doc, 'name', '名称')}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
