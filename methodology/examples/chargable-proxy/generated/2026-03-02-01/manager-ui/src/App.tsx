import { Routes, Route, Link, Navigate } from 'react-router-dom'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex', gap: '16px', padding: '12px 24px',
    background: '#1a1a2e', color: '#fff', alignItems: 'center',
  },
  navLink: { color: '#e0e0e0', textDecoration: 'none', fontSize: '14px' },
  brand: { fontWeight: 'bold', fontSize: '16px', marginRight: 'auto', color: '#fff' },
  main: { padding: '24px', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
}

export default function App() {
  return (
    <div>
      <nav style={styles.nav}>
        <span style={styles.brand}>Proxy Manager</span>
        <Link to="/account" style={styles.navLink}>Account</Link>
        <Link to="/admin" style={styles.navLink}>Admin</Link>
      </nav>
      <div style={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/account" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  )
}
