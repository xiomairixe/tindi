import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminStore } from '../../stores/adminStore'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { checkIsAdmin } = useAdminStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ilagay ang email at password.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Sign in via Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError('Mali ang email o password.')
        setIsLoading(false)
        return
      }

      console.log('Logged in user:', data.user.id)

      // Step 2: Directly query admin_users instead of using store
      // This ensures we use the fresh session from signInWithPassword
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single()

      console.log('Admin query result:', adminData, adminError)

      const isAdmin = !adminError && adminData?.role === 'super_admin'
      console.log('isAdmin:', isAdmin)

      if (!isAdmin) {
        await supabase.auth.signOut()
        setError('Ang account na ito ay walang admin access.')
        setIsLoading(false)
        return
      }

      // Step 3: Sync to store then redirect
      await checkIsAdmin()
      navigate('/admin')
    } catch (err) {
      setError('May nangyaring error. Subukan ulit.')
      console.error('Admin login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2318 0%, #1a3a2a 60%, #14532d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '0 16px',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        .admin-input {
          width: 100%; padding: 11px 14px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 14px; font-family: Inter, sans-serif;
          outline: none; background: #fff; box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          color: #111827;
        }
        .admin-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
        }
        .admin-input::placeholder { color: #9ca3af; }
        .login-btn {
          width: 100%; padding: 12px; background: #16a34a; color: #fff;
          border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
          font-family: Inter, sans-serif; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .login-btn:hover:not(:disabled) { background: #15803d; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 380,
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
        }}>
          {/* Logo / Badge */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #16a34a, #14532d)',
              fontSize: 26, marginBottom: 16,
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
            }}>
              🛡️
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 4px',
              fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
            }}>
              Admin Portal
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              TINDI — Super Admin Access Only
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0, lineHeight: 1.4 }}>
                {error}
              </p>
            </div>
          )}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: '#374151', marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                className="admin-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                placeholder="admin@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: '#374151', marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="admin-input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0,
                    color: '#9ca3af', fontSize: 16, display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                >
                  <i className={`ti ti-eye${showPassword ? '-off' : ''}`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={isLoading}
              style={{ marginTop: 6 }}
            >
              {isLoading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Checking credentials...
                </span>
              ) : (
                'Sign In as Admin'
              )}
            </button>
          </div>

          {/* Footer note */}
          <p style={{
            fontSize: 11, color: '#9ca3af', textAlign: 'center',
            margin: '20px 0 0', lineHeight: 1.5,
          }}>
            This portal is restricted to authorized administrators only.
            <br />
            Regular users should use the{' '}
            <a href="/login" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}>
              main login page
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}