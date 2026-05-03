import { useState } from 'react'
import { createAccounts, createCoupons } from '../api/client'

const s: Record<string, React.CSSProperties> = {
  card: { background: '#f8f9fa', borderRadius: '8px', padding: '20px', marginBottom: '24px' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '160px' },
  inputSm: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100px' },
  btn: { padding: '8px 16px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' as const },
  label: { fontSize: '14px', fontWeight: 'bold' as const, minWidth: '80px' },
  msg: { padding: '8px 12px', borderRadius: '4px', marginTop: '8px', fontSize: '14px' },
  pre: { background: '#e9ecef', padding: '12px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto' as const, maxHeight: '300px' },
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')

  const [accPrefix, setAccPrefix] = useState('')
  const [accCount, setAccCount] = useState(10)
  const [accDomain, setAccDomain] = useState('')
  const [accType, setAccType] = useState('nintendo')
  const [accQuota, setAccQuota] = useState(10)
  const [accDays, setAccDays] = useState(30)
  const [accResult, setAccResult] = useState<string | null>(null)
  const [accMsg, setAccMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [cpnDomain, setCpnDomain] = useState('')
  const [cpnType, setCpnType] = useState('nintendo')
  const [cpnQuota, setCpnQuota] = useState(10)
  const [cpnDays, setCpnDays] = useState(30)
  const [cpnCount, setCpnCount] = useState(10)
  const [cpnResult, setCpnResult] = useState<string | null>(null)
  const [cpnMsg, setCpnMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleCreateAccounts() {
    setAccMsg(null)
    setAccResult(null)
    const res = await createAccounts({
      adminKey, idPrefix: accPrefix, count: accCount,
      domain: accDomain, type: accType,
      quota: accQuota * 1024 * 1024 * 1024, effectiveDays: accDays,
    })
    if (res.ok) {
      setAccResult(JSON.stringify(res.data, null, 2))
      setAccMsg({ text: `成功创建 ${res.data.length} 个账户`, ok: true })
    } else {
      setAccMsg({ text: res.message, ok: false })
    }
  }

  async function handleCreateCoupons() {
    setCpnMsg(null)
    setCpnResult(null)
    const res = await createCoupons({
      adminKey, domain: cpnDomain, type: cpnType,
      quota: cpnQuota * 1024 * 1024 * 1024, effectiveDays: cpnDays, count: cpnCount,
    })
    if (res.ok) {
      setCpnResult(res.data.join('\n'))
      setCpnMsg({ text: `成功创建 ${res.data.length} 个券码`, ok: true })
    } else {
      setCpnMsg({ text: res.message, ok: false })
    }
  }

  return (
    <div>
      <h2>管理后台</h2>

      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>Admin Key</span>
          <input style={s.input} type="password" value={adminKey}
                 onChange={e => setAdminKey(e.target.value)} placeholder="管理员密钥" />
        </div>
      </div>

      <div style={s.card}>
        <h3 style={{ marginTop: 0 }}>创建账户</h3>
        <div style={s.row}>
          <span style={s.label}>ID前缀</span>
          <input style={s.input} value={accPrefix} onChange={e => setAccPrefix(e.target.value)} placeholder="如 user" />
        </div>
        <div style={s.row}>
          <span style={s.label}>数量</span>
          <input style={s.inputSm} type="number" value={accCount} onChange={e => setAccCount(+e.target.value)} />
        </div>
        <div style={s.row}>
          <span style={s.label}>代理域名</span>
          <input style={s.input} value={accDomain} onChange={e => setAccDomain(e.target.value)} placeholder="host:port" />
        </div>
        <div style={s.row}>
          <span style={s.label}>套餐类型</span>
          <input style={s.inputSm} value={accType} onChange={e => setAccType(e.target.value)} />
          <span style={s.label}>配额(GB)</span>
          <input style={s.inputSm} type="number" value={accQuota} onChange={e => setAccQuota(+e.target.value)} />
          <span style={s.label}>天数</span>
          <input style={s.inputSm} type="number" value={accDays} onChange={e => setAccDays(+e.target.value)} />
        </div>
        <div style={s.row}>
          <button style={s.btn} onClick={handleCreateAccounts}>批量创建</button>
        </div>
        {accMsg && <div style={{ ...s.msg, background: accMsg.ok ? '#d4edda' : '#f8d7da', color: accMsg.ok ? '#155724' : '#721c24' }}>{accMsg.text}</div>}
        {accResult && <pre style={s.pre}>{accResult}</pre>}
      </div>

      <div style={s.card}>
        <h3 style={{ marginTop: 0 }}>创建券码</h3>
        <div style={s.row}>
          <span style={s.label}>代理域名</span>
          <input style={s.input} value={cpnDomain} onChange={e => setCpnDomain(e.target.value)} placeholder="host:port" />
        </div>
        <div style={s.row}>
          <span style={s.label}>套餐类型</span>
          <input style={s.inputSm} value={cpnType} onChange={e => setCpnType(e.target.value)} />
          <span style={s.label}>配额(GB)</span>
          <input style={s.inputSm} type="number" value={cpnQuota} onChange={e => setCpnQuota(+e.target.value)} />
          <span style={s.label}>天数</span>
          <input style={s.inputSm} type="number" value={cpnDays} onChange={e => setCpnDays(+e.target.value)} />
        </div>
        <div style={s.row}>
          <span style={s.label}>数量</span>
          <input style={s.inputSm} type="number" value={cpnCount} onChange={e => setCpnCount(+e.target.value)} />
        </div>
        <div style={s.row}>
          <button style={s.btn} onClick={handleCreateCoupons}>批量创建</button>
        </div>
        {cpnMsg && <div style={{ ...s.msg, background: cpnMsg.ok ? '#d4edda' : '#f8d7da', color: cpnMsg.ok ? '#155724' : '#721c24' }}>{cpnMsg.text}</div>}
        {cpnResult && <pre style={s.pre}>{cpnResult}</pre>}
      </div>
    </div>
  )
}
