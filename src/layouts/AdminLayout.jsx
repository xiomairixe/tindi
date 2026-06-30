import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAdminStore } from '../stores/adminStore'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAdminStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
      { path: '/admin',            icon: 'ti-users',   label: 'User Management' },
      { path: '/admin/plans',      icon: 'ti-license', label: 'Plan Management' },
      { path: '/admin/payments',   icon: 'ti-receipt', label: 'Payment Requests' }, // ← dagdag ito
    ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: 'Inter, sans-serif', background: '#f9fafb',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: none; background: none; width: 100%;
          font-family: Inter, sans-serif; font-size: 13px; font-weight: 500;
          color: #9ca3af; transition: all 0.15s ease; text-decoration: none;
          white-space: nowrap; overflow: hidden;
        }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .nav-item.active { background: rgba(22,163,74,0.2); color: #4ade80; }
        .nav-item.active i { color: #4ade80; }
        .nav-item i { font-size: 18px; flex-shrink: 0; }
        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: none; background: none; width: 100%;
          font-family: Inter, sans-serif; font-size: 13px; font-weight: 500;
          color: #f87171; transition: all 0.15s ease; white-space: nowrap;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.1); }
        .logout-btn i { font-size: 18px; flex-shrink: 0; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: collapsed ? 64 : 220,
        background: '#0f2318',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Logo area */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #16a34a, #14532d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                🛡️
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                  TINDI
                </p>
                <p style={{ fontSize: 10, color: '#4ade80', margin: 0, fontWeight: 600, letterSpacing: 1 }}>
                  SUPER ADMIN
                </p>
              </div>
            </div>
          )}

          {collapsed && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #16a34a, #14532d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              🛡️
            </div>
          )}

          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none',
              borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af', flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right' : 'ti-layout-sidebar'}`}
              style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!collapsed && (
            <p style={{
              fontSize: 10, fontWeight: 700, color: '#374151',
              letterSpacing: 1, padding: '4px 12px 8px',
              textTransform: 'uppercase', margin: 0,
            }}>
              Management
            </p>
          )}

          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              title={collapsed ? item.label : ''}
            >
              <i className={`ti ${item.icon}`} />
              {!collapsed && item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="logout-btn"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            title={collapsed ? 'Logout' : ''}
          >
            {isLoggingOut ? (
              <span style={{
                display: 'inline-block', width: 18, height: 18,
                border: '2px solid rgba(248,113,113,0.3)',
                borderTopColor: '#f87171', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
            ) : (
              <i className="ti ti-logout" />
            )}
            {!collapsed && (isLoggingOut ? 'Logging out...' : 'Logout')}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  )
}