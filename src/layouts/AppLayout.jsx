import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuthStore } from '../stores/authStore'

const navItems = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/inventory', icon: 'ti-package', label: 'Inventory' },
  { to: '/sales', icon: 'ti-receipt', label: 'Sales' },
  { to: '/expenses', icon: 'ti-wallet', label: 'Expenses' },
  { to: '/utang', icon: 'ti-users', label: 'Utang' },
]

export default function AppLayout() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { signOut, user } = useAuthStore()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      window.location.replace('/login')
    }
  }

  const storeName = user?.user_metadata?.store_name || 'Aking Tindahan'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: Inter, sans-serif;
        }
        .sidebar-nav-link:hover {
          background: #f0fdf4;
          color: #166534;
        }
        .sidebar-nav-link.active {
          background: #dcfce7;
          color: #15803d;
          font-weight: 700;
        }
        .sidebar-nav-link .nav-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
          background: transparent;
          transition: background 0.15s ease;
        }
        .sidebar-nav-link.active .nav-icon {
          background: #16a34a;
          color: #fff;
        }
        .sidebar-nav-link:not(.active) .nav-icon {
          background: #f3f4f6;
          color: #6b7280;
        }
      `}</style>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <aside style={{
          width: 220,
          background: 'linear-gradient(180deg, #f9fef9 0%, #f0fdf4 100%)',
          borderRight: '1px solid #d1fae5',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0,
          height: '100vh',
          zIndex: 40,
          overflow: 'hidden',
        }}>

          {/* Logo */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #d1fae5' }}>
            <img
              src="/Tindi_logo (2).png"
              alt="Tindi"
              style={{ height: 40, objectFit: 'contain', objectPosition: 'left' }}
            />
          </div>

          {/* Store name */}
          <div
            onClick={() => navigate('/profile')}
            style={{
              padding: '12px 16px', borderBottom: '1px solid #d1fae5',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f0fdf4' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #16a34a, #4ade80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {storeName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: 10, color: '#9ca3af', margin: '0 0 1px',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: 'Inter, sans-serif',
              }}>
                Tindahan
              </p>
              <p style={{
                fontSize: 14, fontWeight: 700, color: '#111827', margin: 0,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {storeName}
              </p>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 14, color: '#d1d5db', flexShrink: 0 }} />
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mascot */}
          <div style={{ position: 'relative', height: 300, flexShrink: 0, overflow: 'visible' }}>
            <img
              src="/Tindi_Nav.png"
              alt="Tindi mascot"
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 240,
                objectFit: 'contain',
                objectPosition: 'bottom',
              }}
            />
          </div>

          {/* Logout */}
          <div style={{ padding: '12px 10px', borderTop: '1px solid #d1fae5' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, color: '#6b7280',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280' }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
              }}>
                <i className="ti ti-logout" aria-hidden="true" />
              </span>
              Logout
            </button>
          </div>

        </aside>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: isMobile ? 0 : 220 }}>

        {/* Top header — mobile only */}
        {isMobile && (
          <header style={{
            background: '#fff', borderBottom: '1px solid #d1fae5',
            padding: '12px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30,
          }}>
            <img src="Tindi_logo (2).png" alt="Tindi" style={{ height: 32, objectFit: 'contain' }} />
            <p style={{ fontSize: 14, color: '#374151', fontWeight: 600, margin: 0 }}>{storeName}</p>
          </header>
        )}

        {/* Page content */}
        <main style={{ flex: 1, paddingBottom: isMobile ? 80 : 0 }}>
          <Outlet />
        </main>

      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #d1fae5',
          zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '8px 4px',
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '4px 10px', borderRadius: 8, textDecoration: 'none',
                color: isActive ? '#16a34a' : '#9ca3af',
                transition: 'color 0.15s ease',
              })}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '4px 10px', borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontFamily: 'Inter, sans-serif',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 22 }} aria-hidden="true" />
            <span style={{ fontSize: 10, fontWeight: 600 }}>Logout</span>
          </button>
        </nav>
      )}

    </div>
  )
}