import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const { signIn } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @keyframes lp-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes lp-error-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-spin {
          to { transform: rotate(360deg); }
        }
        .lp-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          font-family: Inter, sans-serif;
          background: #fff;
          color: #111827;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .lp-input:focus {
          border-color: #3d8f7d;
          box-shadow: 0 0 0 3px rgba(61, 143, 125, 0.12);
        }
        .lp-input::placeholder {
          color: #9ca3af;
        }
        .lp-submit {
          width: 100%;
          padding: 12px;
          background: #3d8f7d;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: Plus Jakarta Sans, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .lp-submit:hover:not(:disabled) {
          background: #2d7a6f;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(61, 143, 125, 0.28);
        }
        .lp-submit:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .lp-submit:disabled {
          background: #9fd3cb;
          cursor: not-allowed;
        }
        .lp-spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: lp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .lp-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-decoration: none;
          padding: 8px 0;
          transition: color 0.2s ease;
        }
        .lp-back:hover {
          color: #3d8f7d;
        }
      `}</style>

      {/* LEFT PANEL — Image */}
      <div style={{
        width: '48%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        borderRight: '1px solid #f0f0f0',
      }}>
        {/* Full-cover image */}
        <img
          src="/Tindi_Wall(2).png"
          alt="Tindi"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Subtle gradient overlay at bottom for logo readability
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)',
          zIndex: 1,
        }} /> */}

        {/* Logo top-left */}
        <div style={{ position: 'absolute', top: 32, left: 36, zIndex: 2 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/Tindi_Logo.png" alt="Tindi" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{
              color: '#000000', fontSize: 22, fontWeight: 900,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}>TINDI</span>
          </Link>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 36, left: 36, right: 36, zIndex: 2,
        }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            margin: '0 0 4px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            Sari-sari store management
          </p>
          <p style={{
            fontSize: 22, fontWeight: 900, color: '#fff',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            margin: 0, lineHeight: 1.3,
            textShadow: '0 1px 6px rgba(0,0,0,0.3)',
          }}>
            Simple. Smart. <span style={{ color: '#9fd3cb' }}>Tindi.</span>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        background: '#fff',
        opacity: mounted ? 1 : 0,
        animation: mounted ? 'lp-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Back link */}
          <Link to="/" className="lp-back" style={{ marginBottom: 36, display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Bumalik sa home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 28, fontWeight: 900, color: '#111827',
              fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 6px',
            }}>
              Mag-login
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Wala pang account?{' '}
              <Link to="/register" style={{ color: '#3d8f7d', fontWeight: 700, textDecoration: 'none' }}>
                Mag-register
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 20,
              animation: 'lp-error-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input
                className="lp-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ikaw@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                <a href="#" style={{ fontSize: 12, color: '#3d8f7d', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot Password?
                </a>
              </div>
              <input
                className="lp-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <button type="submit" className="lp-submit" disabled={isLoading}>
                {isLoading && <span className="lp-spinner" />}
                {isLoading ? 'Naglo-login...' : 'Mag-login'}
              </button>
            </div>
          </form>

          {/* Trust badge */}
          <div style={{
            background: '#f9fafb', border: '1.5px solid #e8f5f3', borderRadius: 10,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, background: '#e8f5f3', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Secure at protektado</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Ang iyong data ay ligtas at encrypted.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}