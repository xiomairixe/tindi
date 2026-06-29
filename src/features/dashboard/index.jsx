import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import { useSalesStore } from '../../stores/salesStore'
import { useExpensesStore } from '../../stores/expensesStore'
import { useUtangStore } from '../../stores/utangStore'

const todayStr = () => new Date().toISOString().split('T')[0]

const formatPeso = (val) =>
  '₱' + parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

const formatTime = (tsStr) => {
  if (!tsStr) return ''
  const d = new Date(tsStr)
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const getLastNDays = (n) => {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const shortLabel = d.toLocaleDateString('en-PH', { weekday: 'short' })
    days.push({ dateStr, shortLabel })
  }
  return days
}

const getCurrentMonthDays = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ dateStr: d.toISOString().split('T')[0], label: `${i}` })
  }
  return days
}

const getCurrentYearMonths = () => {
  const now = new Date()
  const year = now.getFullYear()
  const months = []
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1)
    months.push({ month: m, year, label: d.toLocaleDateString('en-PH', { month: 'short' }) })
  }
  return months
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
        <p style={{ color: '#6b7280', margin: '0 0 2px' }}>{label}</p>
        <p style={{ color: '#15803d', fontWeight: 700, margin: 0 }}>{formatPeso(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

const PERIOD_OPTIONS = [
  { value: '7days', label: '7 Days' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, storeId, isLoading: authLoading } = useAuthStore()
  const { sales, isLoading: salesLoading, fetchSales } = useSalesStore()
  const { expenses, isLoading: expensesLoading, fetchExpenses } = useExpensesStore()
  const { debtors, fetchDebtors, fetchUtangRecords, fetchUtangPayments, getGrandTotalBalance } = useUtangStore()
  const [chartPeriod, setChartPeriod] = useState('7days')
  const isLoading = salesLoading || expensesLoading

  useEffect(() => {
    if (authLoading || !storeId) return
    fetchSales(storeId)
    fetchExpenses(storeId)
    fetchDebtors(storeId)
    fetchUtangRecords(storeId)
    fetchUtangPayments(storeId)
  }, [storeId, authLoading])

  const storeName = user?.user_metadata?.store_name || 'Aking Tindahan'
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || storeName

  const today = new Date().toLocaleDateString('fil-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const monthlySales = useMemo(() => {
    const now = new Date()
    return sales.filter(s => {
      const d = new Date(s.sale_date + 'T00:00:00')
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  }, [sales])

  const previousMonthSales = useMemo(() => {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return sales.filter(s => {
      const d = new Date(s.sale_date + 'T00:00:00')
      return d.getFullYear() === prevMonth.getFullYear() && d.getMonth() === prevMonth.getMonth()
    }).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  }, [sales])

  const monthlyExpenses = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => {
      const d = new Date(e.expense_date + 'T00:00:00')
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }, [expenses])

  const previousMonthExpenses = useMemo(() => {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return expenses.filter(e => {
      const d = new Date(e.expense_date + 'T00:00:00')
      return d.getFullYear() === prevMonth.getFullYear() && d.getMonth() === prevMonth.getMonth()
    }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }, [expenses])

  const monthlyProfit = monthlySales - monthlyExpenses

  const salesVsPreviousMonth = useMemo(() => {
    if (previousMonthSales === 0) return null
    return ((monthlySales - previousMonthSales) / previousMonthSales) * 100
  }, [monthlySales, previousMonthSales])

  const expensesVsPreviousMonth = useMemo(() => {
    if (previousMonthExpenses === 0) return null
    return ((monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
  }, [monthlyExpenses, previousMonthExpenses])

  const grandUtangBalance = getGrandTotalBalance()
  const debtorCount = useMemo(
    () => debtors.filter(d => {
      const { getDebtorBalance } = useUtangStore.getState()
      return getDebtorBalance(d.id) > 0
    }).length,
    [debtors]
  )

  const chartData = useMemo(() => {
    if (chartPeriod === '7days') {
      return getLastNDays(7).map(({ dateStr, shortLabel }) => ({
        label: shortLabel,
        benta: sales.filter(s => s.sale_date === dateStr).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
      }))
    }
    if (chartPeriod === 'month') {
      return getCurrentMonthDays().map(({ dateStr, label }) => ({
        label,
        benta: sales.filter(s => s.sale_date === dateStr).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
      }))
    }
    if (chartPeriod === 'year') {
      return getCurrentYearMonths().map(({ month, year, label }) => ({
        label,
        benta: sales.filter(s => {
          const d = new Date(s.sale_date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() === month
        }).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
      }))
    }
    return []
  }, [sales, chartPeriod])

  const chartTotal = chartData.reduce((sum, d) => sum + d.benta, 0)

  const chartPeriodLabel = useMemo(() => {
    if (chartPeriod === '7days') return 'Nakaraang 7 araw'
    if (chartPeriod === 'month') return new Date().toLocaleDateString('fil-PH', { month: 'long', year: 'numeric' })
    return `${new Date().getFullYear()}`
  }, [chartPeriod])

  const recentSales = useMemo(() =>
    [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [sales]
  )

  const summaryCards = [
    {
      label: 'Benta ngayong buwan',
      value: formatPeso(monthlySales),
      sub: salesVsPreviousMonth !== null
        ? `${salesVsPreviousMonth >= 0 ? '+' : ''}${salesVsPreviousMonth.toFixed(1)}% vs nakaraang buwan`
        : 'Walang benta nakaraang buwan',
      positive: salesVsPreviousMonth === null ? null : salesVsPreviousMonth >= 0,
      bg: '#e8f5e9',
      iconBg: '#4caf50',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
    },
    {
      label: 'Gastos ngayong buwan',
      value: formatPeso(monthlyExpenses),
      sub: expensesVsPreviousMonth !== null
        ? `${expensesVsPreviousMonth >= 0 ? '+' : ''}${expensesVsPreviousMonth.toFixed(1)}% vs nakaraang buwan`
        : 'Walang gastos nakaraang buwan',
      positive: expensesVsPreviousMonth === null ? null : expensesVsPreviousMonth <= 0,
      bg: '#fff3e0',
      iconBg: '#ff9800',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      ),
    },
    {
      label: 'Kita (profit)',
      value: formatPeso(monthlyProfit),
      sub: 'Benta minus gastos',
      positive: monthlyProfit >= 0,
      bg: '#e3f2fd',
      iconBg: '#2196f3',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
    {
      label: 'Mga may Utang',
      value: `${debtorCount}`,
      sub: grandUtangBalance > 0 ? `${formatPeso(grandUtangBalance)} kabuuan` : 'Walang balance',
      positive: grandUtangBalance === 0 ? null : false,
      bg: '#f3e5f5',
      iconBg: '#9c27b0',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        .dash-quick-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: none;
          transition: all 0.15s ease; font-family: Inter, sans-serif;
        }
        .dash-quick-btn:hover { transform: translateY(-1px); }
        .dash-period-btn {
          padding: 5px 12px; border-radius: 6px; font-size: 12px;
          font-weight: 600; cursor: pointer; border: none;
          transition: all 0.15s ease; font-family: Inter, sans-serif;
        }
      `}</style>

      {/* ── HERO BANNER ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #b2dfdb 100%)',
        minHeight: 180,
      }}>
        {/* Cover image */}
        <img
          src="/Tindi_cover.png"
          alt=""
          style={{
            position: 'absolute', right: 0, top: '50%',
            transform: 'translateY(-36%)',
            height: '140%', width: '55%',
            objectFit: 'cover', objectPosition: 'left center',
          }}
        />
        {/* Gradient fade left */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #dff0e0 30%, rgba(223,240,224,0.7) 55%, transparent 75%)',
        }} />

        {/* Text content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '32px 28px 28px' }}>
          <h1 style={{
            fontSize: 26, fontWeight: 900, color: '#1a3a2a',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            margin: '0 0 4px',
          }}>
            Hi {firstName}! 👋
          </h1>
          <p style={{ fontSize: 14, color: '#4a7a5a', margin: '0 0 8px', fontWeight: 500 }}>{today}</p>
          <p style={{ fontSize: 13, color: '#5a8a6a', margin: 0, fontStyle: 'italic' }}>
            Maliit na Bantay. Malaking Tulong.
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 24px 32px' }}>

        {/* ── SUMMARY CARDS ── */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 18, height: 100, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {summaryCards.map((card) => (
              <div key={card.label} style={{
                background: '#fff',
                borderRadius: 16,
                padding: '16px 18px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: '1px solid #f0f0f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>{card.label}</p>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: card.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {card.icon}
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {card.value}
                </p>
                <p style={{
                  fontSize: 12, margin: 0,
                  color: card.positive === true ? '#16a34a' : card.positive === false ? '#ea580c' : '#9ca3af',
                }}>
                  {card.sub}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className="dash-quick-btn"
            onClick={() => navigate('/sales')}
            style={{ background: '#16a34a', color: '#fff', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
          >
            <i className="ti ti-plus" aria-hidden="true" /> Add Sales
          </button>
          <button
            className="dash-quick-btn"
            onClick={() => navigate('/expenses')}
            style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb' }}
          >
            <i className="ti ti-minus" aria-hidden="true" style={{ color: '#f97316' }} /> Add Expenses
          </button>
          <button
            className="dash-quick-btn"
            onClick={() => navigate('/inventory')}
            style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb' }}
          >
            <i className="ti ti-package" aria-hidden="true" /> Add Product
          </button>
        </div>

        {/* ── CHART + RECENT SALES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Chart */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <i className="ti ti-trending-up" style={{ color: '#16a34a', fontSize: 16 }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Benta — {chartPeriodLabel}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{formatPeso(chartTotal)} total</p>
              </div>
              <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="dash-period-btn"
                    onClick={() => setChartPeriod(opt.value)}
                    style={{
                      background: chartPeriod === opt.value ? '#fff' : 'transparent',
                      color: chartPeriod === opt.value ? '#16a34a' : '#6b7280',
                      boxShadow: chartPeriod === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div style={{ height: 200, background: '#f9fafb', borderRadius: 8 }} />
            ) : chartTotal === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <i className="ti ti-chart-line" style={{ fontSize: 32, color: '#d1d5db' }} />
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Walang benta sa period na ito</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bentaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={chartPeriod === 'month' ? 4 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="benta" stroke="#16a34a" strokeWidth={2.5} fill="url(#bentaGradient)" dot={false} activeDot={{ r: 5, fill: '#16a34a' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent sales */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <i className="ti ti-star-filled" style={{ color: '#f59e0b', fontSize: 15 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Pinakabagong Benta</p>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ height: 36, background: '#f9fafb', borderRadius: 6 }} />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                <i className="ti ti-receipt-off" style={{ fontSize: 28, color: '#d1d5db' }} />
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Walang benta pa</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentSales.map((sale) => (
                  <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 2px', fontWeight: 500 }}>
                        {formatDateShort(sale.sale_date)}{sale.created_at && ` · ${formatTime(sale.created_at)}`}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sale.notes || 'Walang description'}
                      </p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, flexShrink: 0 }}>
                      {formatPeso(sale.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/sales')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16a34a', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0 0', fontFamily: 'Inter, sans-serif' }}
            >
              Show more  <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
            </button>
          </div>
        </div>

        {/* ── BOTTOM BANNER ── */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: 20, border: '1px solid #bbf7d0',
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 20,
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Mascot */}
          <img
            src="/Tindi_Head.png"
            alt="Tindi"
            style={{ width: 140, height: 140, objectFit: 'contain', flexShrink: 0 }}
          />

          {/* Text */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#14532d', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px' }}>
              Tuloy ang Tindi! 🌱
            </h3>
            <p style={{ fontSize: 13, color: '#166534', margin: 0, lineHeight: 1.6 }}>
              Ang bawat benta mo, hakbang mo patungo sa mas magandang bukas.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {[
              { icon: '🛒', label: 'Itala', sub: 'Bawat transaksyon ay mahalaga.', color: '#16a34a' },
              { icon: '📊', label: 'I-track', sub: 'Bantayan ang kita at gastos.', color: '#f97316' },
              { icon: '🚀', label: 'I-grow', sub: 'Palaguin ang iyong tindahan!', color: '#7c3aed' },
            ].map((item) => (
              <div key={item.label} style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                border: '1px solid #e5e7eb', minWidth: 110, textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 800, color: item.color, margin: '0 0 3px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}