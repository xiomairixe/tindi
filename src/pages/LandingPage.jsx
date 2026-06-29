import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

/* Reusable scroll-reveal wrapper: fades + slides content up when it enters the viewport */
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : `translateY(${y}px)`,
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    const t = setTimeout(() => setHeroVisible(true), 80)
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onScroll)
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  useEffect(() => {
    const sectionIds = ['hero', 'features', 'about', 'contact']
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )

    sections.forEach((sec) => observer.observe(sec))
    return () => observer.disconnect()
  }, [])

  const navLinkStyle = (id) => ({
    color: activeSection === id ? '#2d5f54' : '#4b5563',
    textDecoration: 'none',
    fontWeight: activeSection === id ? 700 : 500,
    position: 'relative',
    paddingBottom: 4,
    transition: 'color 0.2s ease',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Sticky Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: scrolled ? '10px 48px' : '16px 48px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'padding 0.25s ease, box-shadow 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Tindi.png" alt="Tindi" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontWeight: 900, fontSize: 20, color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>TINDI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, fontSize: 14 }}>
          {[
            { id: 'hero', label: 'Home' },
            { id: 'features', label: 'Features' },
            { id: 'about', label: 'About Me' },
            { id: 'contact', label: 'Contact' },
          ].map((item, i) => (
            <a
              key={item.label + i}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(item.id)
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 76
                  window.scrollTo({ top, behavior: 'smooth' })
                }
              }}
              style={navLinkStyle(item.id)}
            >
              {item.label}
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: -2, height: 2,
                background: '#3d8f7d', borderRadius: 2,
                transform: activeSection === item.id ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.25s ease',
              }} />
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={{ padding: '10px 20px', color: '#4b5563', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Login</Link>
          <Link to="/register"
            style={{ padding: '10px 20px', background: '#3d8f7d', borderRadius: 6, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
            onMouseOver={(e) => e.target.style.background = '#2d7a6f'}
            onMouseOut={(e) => e.target.style.background = '#3d8f7d'}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" style={{ position: 'relative', width: '100%', height: '90vh', minHeight: 560, overflow: 'hidden', background: '#f5faf9' }}>
        <img
          src="/Tindi_cover.png"
          alt="Tindi Store"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'right center' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #ffffff 0%, #ffffff 38%, rgba(255,255,255,0.85) 52%, rgba(255,255,255,0.3) 66%, rgba(255,255,255,0) 78%)',
          zIndex: 2,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
          background: 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0) 100%)',
          zIndex: 3,
        }} />
        <div style={{
          position: 'absolute', left: '6%', top: '50%', transform: 'translateY(-50%)', zIndex: 10, maxWidth: 500,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(-50%)' : 'translateY(-46%)',
          transition: 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            display: 'inline-block', background: '#e8f5f3', padding: '6px 14px', borderRadius: 100,
            fontSize: 11, fontWeight: 700, color: '#2d5f54', marginBottom: 22, letterSpacing: '0.5px',
          }}>
            SARI-SARI STORE MANAGEMENT SYSTEM
          </div>
          <h1 style={{ fontSize: 58, fontWeight: 900, color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.07, margin: '0 0 20px' }}>
            Simple.<br />Smart.<br /><span style={{ color: '#3d8f7d' }}>Tindi.</span>
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, margin: '0 0 30px', maxWidth: 400 }}>
            Ang kumpleto at madaling gamitin na management system para sa mga sari-sari store owners. I-manage lahat sa isang lugar.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <Link
              to="/register"
              style={{ padding: '11px 26px', background: '#3d8f7d', borderRadius: 8, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(61, 143, 125, 0.25)', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#2d7a6f'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#3d8f7d'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Get Started Free →
            </Link>
            <button
              style={{ padding: '11px 26px', background: 'transparent', border: '2px solid #e5e7eb', borderRadius: 8, color: '#4b5563', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3d8f7d'; e.currentTarget.style.color = '#3d8f7d'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#4b5563'; }}
            >
              ▶ Watch Demo
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>✓ Walang credit card. Walang setup fee.</p>
        </div>
      </section>

      {/* Trust Section */}
      <section style={{ background: '#fff', padding: '72px 48px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 40px', letterSpacing: '1.5px' }}>
            PINAGKAKATIWALAAN NG MGA SARI-SARI STORE OWNERS
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              {
                label: 'Madaling Gamitin', desc: 'User-friendly interface para sa lahat',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
              },
              {
                label: 'Secure at Maaasahan', desc: 'Ang iyong data ay ligtas palagi',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
              },
              {
                label: 'Cloud-Based', desc: 'I-access kahit saan, kahit kailan',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>,
              },
              {
                label: 'Mabilis na Support', desc: 'Nandito kami para tumulong sayo',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"/></svg>,
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 90}>
                <div style={{ background: '#fff', border: '1.5px solid #e8f5f3', borderRadius: 16, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16, transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s', cursor: 'default' }}
                  onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(61,143,125,0.10)'; e.currentTarget.style.borderColor = '#3d8f7d'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8f5f3'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: 52, height: 52, background: '#e8f5f3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.label}</p>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section id="features" style={{ background: '#fff', padding: '100px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* Top row: text left, dashboard image right */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2fr', gap: 72, alignItems: 'center', marginBottom: 80 }}>
            <Reveal>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3d8f7d', textTransform: 'uppercase', margin: '0 0 12px', letterSpacing: '1px' }}>FEATURES</p>
                <h2 style={{ fontSize: 44, fontWeight: 900, color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 16px' }}>
                  Everything you need to run your store
                </h2>
                <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.75 }}>
                  Tindi helps you manage your inventory, sales, customers, and reports in one powerful yet simple system.
                </p>
                <a href="#" style={{ fontSize: 15, fontWeight: 700, color: '#3d8f7d', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>Learn More →</a>
              </div>
            </Reveal>
            <Reveal delay={150} y={36}>
              <div style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                <img src="/Tindi_Dashboard.png" alt="Tindi Dashboard" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </Reveal>
          </div>

          {/* "Powerful features" heading row */}
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-end', marginBottom: 40 }}>
              <div />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 10px', letterSpacing: '1.5px' }}>WHAT YOU CAN DO</p>
                <h2 style={{ fontSize: 36, fontWeight: 900, color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                  Powerful features, made simple
                </h2>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <img src="/Tindi (2).png" alt="Tindi Mascot" style={{ width: 220, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.08))', marginBottom: -8 }} />
              </div>
            </div>
          </Reveal>

          {/* Feature strip */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: '#fafafa', borderRadius: 16, border: '1px solid #f0f0f0', padding: '36px 28px' }}>
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, title: 'Inventory Management', desc: 'Track stocks in real-time at huwag maubusan ng bestsellers.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>, title: 'Sales & Checkout', desc: 'Mabilis na billing na may maraming paraan ng bayad.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, title: 'Reports & Analytics', desc: 'Gumawa ng mas matalinong desisyon gamit ang data.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>, title: 'Multi-Device Access', desc: 'I-access ang iyong tindahan kahit saan, kahit kailan.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d8f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'Secure & Backup', desc: 'Ang iyong data ay protektado at naka-backup awtomatiko.' },
            ].map((item, i, arr) => (
              <Reveal key={i} delay={i * 80} y={18} style={{ flex: 1 }}>
                <div style={{ padding: '0 22px', borderRight: i < arr.length - 1 ? '1px solid #e8f5f3' : 'none', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                  <div style={{ width: 44, height: 44, background: '#e8f5f3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', margin: '0 0 5px', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.3 }}>{item.title}</h3>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* Built for sari-sari — beige tray with white card inside */}
      <section id="about" style={{ background: '#fff', padding: '100px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* White card wrapper */}
          <div style={{ background: '#f5f0e8', borderRadius: 28, padding: '64px 60px', boxShadow: '0 8px 40px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 60, alignItems: 'center' }}>

              {/* Left: text + CTA */}
              <Reveal>
                <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3d8f7d', textTransform: 'uppercase', margin: '0 0 12px', letterSpacing: '1px' }}>WHY TINDI?</p>
                <h2 style={{ fontSize: 48, fontWeight: 900, color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 32px', lineHeight: 1.1 }}>
                  Built for sari-sari store owners like you
                </h2>
                <div style={{ display: 'grid', gap: 16, marginBottom: 36 }}>
                  {[
                    'Save time on daily tasks',
                    'Reduce human errors',
                    'Increase profit and control',
                    'Understand your business better',
                    'Grow your store with confidence',
                  ].map((item, i) => (
                    <Reveal key={i} delay={i * 70} y={14}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3d8f7d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <p style={{ fontSize: 16, color: '#1a1a1a', margin: 0, fontWeight: 600 }}>{item}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <Link
                  to="/register"
                  style={{ padding: '14px 32px', background: '#2d6e3e', borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(45, 110, 62, 0.25)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#235530'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#2d6e3e'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Get Started Free →
                </Link>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/>
                  </svg>
                  No credit card required
                </p>
                </div>
              </Reveal>

              {/* Right: mascot (bigger) with testimonial card overlapping in front of it */}
              <Reveal delay={150} y={36}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 460 }}>
                <style>{`
                  @keyframes tindi-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-16px); }
                  }
                  .tindi-card-float {
                    animation: tindi-float 3.5s ease-in-out infinite;
                  }
                `}</style>

                <img
                  src="/Tindi (3).png"
                  alt="Tindi Mascot"
                  style={{
                    width: '100%',
                    maxWidth: 560,
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: 24,
                    filter: 'drop-shadow(0 24px 40px rgba(0, 0, 0, 0.13))',
                  }}
                />

                <div className="tindi-card-float" style={{
                  position: 'absolute',
                  right: -20,
                  bottom: '14%',
                  background: '#fff',
                  borderRadius: 20,
                  padding: '28px 26px',
                  boxShadow: '0 14px 44px rgba(0, 0, 0, 0.14)',
                  border: '1px solid #f0f0f0',
                  maxWidth: 270,
                  width: '85%',
                  zIndex: 5,
                }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: '#1a1a1a', margin: '0 0 20px', lineHeight: 1.75, fontStyle: 'italic' }}>
                    "Ang dali gamitin at sobrang nakatulong sa tindahan ko!"
                  </p>
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Maria Santos</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Sari-sari Store Owner</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3d8f7d' }} />
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#d1d5db' }} />
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#d1d5db' }} />
                  </div>
                </div>
                </div>
              </Reveal>

            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" style={{ background: '#FAF8F5', padding: '40px 48px 100px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
          <Reveal y={32}>
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #2d5f3f 0%, #244e33 100%)',
            borderRadius: 28,
            padding: '36px 48px 36px 300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
            overflow: 'hidden',
          }}>

            {/* Decorative leaf graphic, bottom right */}
            <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute', right: -10, bottom: -30, opacity: 0.12 }}>
              <path d="M80 140 C80 100 60 70 30 60 C60 60 90 75 100 105 C110 75 140 60 150 60 C130 80 110 110 110 140 Z" fill="#fff" />
            </svg>

            {/* Mascot peeking from bottom-left, overflowing the card */}
            <img
              src="/Tindi (4).png"
              alt="Tindi Mascot"
              style={{
                position: 'absolute',
                left: 0,
                bottom: -38,
                width: 300,
                height: 'auto',
                objectFit: 'contain',
                zIndex: 2,
                filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))',
              }}
            />

            {/* Text */}
            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 8px', lineHeight: 1.25 }}>
                Ready to take your store<br />to the next level?
              </h2>
              <p style={{ fontSize: 15, color: '#cfe3d6', margin: 0, lineHeight: 1.5 }}>
                Join thousands of sari-sari store owners who trust Tindi.
              </p>
            </div>

            {/* CTA + note */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
              <Link
                to="/register"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#fff', color: '#1a1a1a', borderRadius: 999, textDecoration: 'none', fontWeight: 700, fontSize: 15, transition: 'all 0.2s', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 22px rgba(0, 0, 0, 0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)'; }}
              >
                Get Started Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <p style={{ fontSize: 12, color: '#cfe3d6', margin: '12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cfe3d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/>
                </svg>
                No credit card required
              </p>
            </div>

          </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1a1a1a', padding: '80px 48px 32px', color: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, marginBottom: 60 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', margin: '0 0 20px', letterSpacing: '1px' }}>Tindi</h4>
              <p style={{ fontSize: 14, color: '#a0aec0', margin: 0, lineHeight: 1.7 }}>
                Simpleng solusyon para sa sari-sari store owners na gustong mag-level up.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', margin: '0 0 20px', letterSpacing: '1px' }}>Product</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {[
                  { label: 'Home', href: '#hero' },
                  { label: 'Features', href: '#features' },
                  { label: 'About Us', href: '#about' },
                  { label: 'Contact', href: '#contact' },
                ].map((item) => (
                  <li key={item.label} style={{ marginBottom: 12 }}>
                    <a href={item.href} style={{ color: '#a0aec0', textDecoration: 'none', fontSize: 14 }} onMouseOver={(e) => e.target.style.color = '#3d8f7d'} onMouseOut={(e) => e.target.style.color = '#a0aec0'}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', margin: '0 0 20px', letterSpacing: '1px' }}>Support</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {['Help Center', 'Guides', 'FAQ', 'Privacy Policy'].map((item) => (
                  <li key={item} style={{ marginBottom: 12 }}>
                    <a href="#" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: 14, cursor: 'default' }}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
              © 2024 Tindi. Lahat ng karapatan ay nakalaan.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                Made by <span style={{ color: '#fff', fontWeight: 600 }}>Glen Honrado</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Facebook */}
                <a href="https://www.facebook.com/honradoglen/" aria-label="Facebook" style={{ color: '#a0aec0', display: 'flex' }} onMouseOver={(e) => e.currentTarget.style.color = '#3d8f7d'} onMouseOut={(e) => e.currentTarget.style.color = '#a0aec0'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.06 5.66 21.2 10.44 21.95V14.9H7.9V12.06h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.87h2.78l-.44 2.84h-2.34v7.05C18.34 21.2 22 17.06 22 12.06z"/></svg>
                </a>
                {/* GitHub */}
                <a href="#" aria-label="GitHub" style={{ color: '#a0aec0', display: 'flex' }} onMouseOver={(e) => e.currentTarget.style.color = '#3d8f7d'} onMouseOut={(e) => e.currentTarget.style.color = '#a0aec0'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.65.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .28.18.61.69.5A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/></svg>
                </a>
                {/* LinkedIn */}
                <a href="#" aria-label="LinkedIn" style={{ color: '#a0aec0', display: 'flex' }} onMouseOver={(e) => e.currentTarget.style.color = '#3d8f7d'} onMouseOut={(e) => e.currentTarget.style.color = '#a0aec0'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C13.67 9.94 12.8 11 12.43 11.78V10.13H9.69V18.5H12.43V13.57C12.43 12.8 12.5 12.05 13.43 12.05C14.36 12.05 14.5 12.94 14.5 13.62V18.5H18.5M6.88 8.56A1.68 1.68 0 1 0 6.89 5.2A1.68 1.68 0 0 0 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}