import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { queryAccount, bindPackage, PackageView } from '../api/client'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatType(type: string): string {
  return type === 'nintendo' ? 'Switch加速包' : type
}

function formatSpeed(domain: string): string {
  const host = domain.split(':')[0]
  if (host.startsWith('xs')) return '(极速版)'
  if (host.startsWith('hs')) return '(高速版)'
  return ''
}

function splitDomain(domain: string): { server: string; port: string } {
  const parts = domain.split(':')
  return { server: parts[0], port: parts[1] || '' }
}

function formatTime(ts: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#f8f9fa', borderRadius: '8px', padding: '20px', marginBottom: '16px' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '200px' },
  btn: { padding: '8px 16px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  btnSec: { padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '8px', borderBottom: '2px solid #dee2e6', background: '#e9ecef' },
  td: { padding: '8px', borderBottom: '1px solid #dee2e6' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' as const },
  label: { fontSize: '14px', fontWeight: 'bold' as const, minWidth: '60px' },
  msg: { padding: '8px 12px', borderRadius: '4px', marginTop: '8px', fontSize: '14px' },
  link: { color: '#4a6cf7', textDecoration: 'underline', fontSize: '13px' },
}

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [username, setUsername] = useState(searchParams.get('u') || '')
  const [password, setPassword] = useState('')
  const [packages, setPackages] = useState<PackageView[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleLogin() {
    setMessage(null)
    const res = await queryAccount(username, password)
    if (res.ok) {
      setPackages(res.data.packages)
      setLoggedIn(true)
      setSearchParams({ u: username })
    } else {
      setMessage({ text: res.message, ok: false })
    }
  }

  async function handleBind() {
    setMessage(null)
    const res = await bindPackage(username, password, couponCode)
    if (res.ok) {
      setCouponCode('')
      setMessage({ text: '绑定成功', ok: true })
      const refreshed = await queryAccount(username, password)
      if (refreshed.ok) setPackages(refreshed.data.packages)
    } else {
      setMessage({ text: res.message, ok: false })
    }
  }

  return (
    <div>
      <h2>账户查询</h2>

      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>用户名</span>
          <input style={s.input} value={username} onChange={e => setUsername(e.target.value)}
                 placeholder="输入用户名" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={s.row}>
          <span style={s.label}>密码</span>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)}
                 placeholder="输入密码" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={s.row}>
          <button style={s.btn} onClick={handleLogin}>查询</button>
        </div>
      </div>

      {message && (
        <div style={{ ...s.msg, background: message.ok ? '#d4edda' : '#f8d7da', color: message.ok ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '12px', fontSize: '13px' }}>
        <a href="https://item.taobao.com/item.htm?id=828597203393" target="_blank" rel="noreferrer" style={s.link}>购买账号</a>
        {' | '}
        <a href="https://item.taobao.com/item.htm?id=829129514317" target="_blank" rel="noreferrer" style={s.link}>购买券码</a>
      </div>

      {loggedIn && (
        <>
          <div style={s.card}>
            <div style={s.row}>
              <span style={s.label}>兑换码</span>
              <input style={s.input} value={couponCode} onChange={e => setCouponCode(e.target.value)}
                     placeholder="XXXX-XXXX-XXXX-XXXX" onKeyDown={e => e.key === 'Enter' && handleBind()} />
              <button style={s.btnSec} onClick={handleBind}>绑定套餐</button>
            </div>
          </div>

          <h3>套餐列表</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>类型</th>
                  <th style={s.th}>服务器</th>
                  <th style={s.th}>端口</th>
                  <th style={s.th}>速度</th>
                  <th style={s.th}>配额</th>
                  <th style={s.th}>已用</th>
                  <th style={s.th}>状态</th>
                  <th style={s.th}>有效天数</th>
                  <th style={s.th}>激活时间</th>
                  <th style={s.th}>到期时间</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => {
                  const { server, port } = splitDomain(pkg.domain)
                  return (
                    <tr key={pkg.id}>
                      <td style={s.td}>{formatType(pkg.type)}</td>
                      <td style={s.td}>{server}</td>
                      <td style={s.td}>{port}</td>
                      <td style={s.td}>{formatSpeed(pkg.domain)}</td>
                      <td style={s.td}>{formatBytes(pkg.quota)}</td>
                      <td style={s.td}>{formatBytes(pkg.usedQuota)}</td>
                      <td style={s.td}>{pkg.status}</td>
                      <td style={s.td}>{pkg.effectiveDays}</td>
                      <td style={s.td}>{formatTime(pkg.activateTime)}</td>
                      <td style={s.td}>{formatTime(pkg.expireTime)}</td>
                    </tr>
                  )
                })}
                {packages.length === 0 && (
                  <tr><td colSpan={10} style={{ ...s.td, textAlign: 'center', color: '#999' }}>暂无套餐</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
