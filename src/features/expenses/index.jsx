import { useEffect, useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import { useExpensesStore } from '../../stores/expensesStore'
import AddExpenseModal from './components/AddExpenseModal'

const FILTERS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const CATEGORY_COLORS = {
  Supplies: { bg: '#dbeafe', text: '#1e40af' },
  Utilities: { bg: '#fef3c7', text: '#92400e' },
  Rent: { bg: '#e9d5ff', text: '#6b21a8' },
  Salaries: { bg: '#dcfce7', text: '#15803d' },
  Maintenance: { bg: '#ffedd5', text: '#92400c' },
  Transport: { bg: '#cffafe', text: '#0c4a6e' },
  Other: { bg: '#f3f4f6', text: '#374151' },
}

const LINE_COLORS = [
  '#16a34a', '#3b82f6', '#a855f7', '#eab308',
  '#f97316', '#0ea5e9', '#ec4899', '#6b7280',
]

const DEFAULT_BAR_COLOR = '#16a34a'

const todayStr = () => new Date().toISOString().split('T')[0]

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatMonthYear = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

const getCategoryColor = (category) =>
  CATEGORY_COLORS[category] || { bg: '#d1fae5', text: '#15803d' }

const formatCurrency = (value) =>
  parseFloat(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const exportToCSV = (expenses, periodLabel) => {
  const headers = ['Date', 'Category', 'Amount', 'Notes']
  const rows = expenses.map((e) => [
    e.expense_date,
    e.category,
    parseFloat(e.amount).toFixed(2),
    e.notes ? `"${e.notes.replace(/"/g, '""')}"` : '',
  ])
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `expenses-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 140 }}>
      <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 8px', fontSize: 13 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#6b7280', flex: 1 }}>{p.dataKey}</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>₱{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ExpensesPage() {
  const { storeId, isLoading: authLoading } = useAuthStore()
  const { expenses, isLoading, error, fetchExpenses, fetchCustomCategories } = useExpensesStore()

  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [filterType, setFilterType] = useState('monthly')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    if (authLoading) return
    if (!storeId) return
    fetchExpenses(storeId)
    fetchCustomCategories(storeId)
  }, [storeId, authLoading])

  const filteredByPeriod = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    return expenses.filter((expense) => {
      const expDate = new Date(expense.expense_date + 'T00:00:00')
      if (filterType === 'monthly') {
        return (
          expDate.getFullYear() === ref.getFullYear() &&
          expDate.getMonth() === ref.getMonth()
        )
      }
      if (filterType === 'yearly') return expDate.getFullYear() === ref.getFullYear()
      return true
    })
  }, [expenses, filterType, selectedDate])

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'All') return filteredByPeriod
    return filteredByPeriod.filter((e) => e.category === categoryFilter)
  }, [filteredByPeriod, categoryFilter])

  const availableCategories = useMemo(() => {
    const cats = [...new Set(filteredByPeriod.map((e) => e.category))]
    return cats.sort()
  }, [filteredByPeriod])

  const categoryBreakdown = useMemo(() => {
    const map = {}
    filteredByPeriod.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [filteredByPeriod])

  // Build line chart data: x-axis = day of month (monthly) or month (yearly)
  const { chartData, chartCategories } = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    const categories = [...new Set(filteredByPeriod.map((e) => e.category))].sort()

    let points = []

    if (filterType === 'monthly') {
      const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      points = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const label = `${day}`
        const row = { label }
        categories.forEach((cat) => { row[cat] = 0 })
        return row
      })
      filteredByPeriod.forEach((e) => {
        const day = new Date(e.expense_date + 'T00:00:00').getDate()
        if (points[day - 1]) {
          points[day - 1][e.category] = (points[day - 1][e.category] || 0) + parseFloat(e.amount || 0)
        }
      })
    } else {
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      points = MONTHS.map((label) => {
        const row = { label }
        categories.forEach((cat) => { row[cat] = 0 })
        return row
      })
      filteredByPeriod.forEach((e) => {
        const month = new Date(e.expense_date + 'T00:00:00').getMonth()
        if (points[month]) {
          points[month][e.category] = (points[month][e.category] || 0) + parseFloat(e.amount || 0)
        }
      })
    }

    return { chartData: points, chartCategories: categories }
  }, [filteredByPeriod, filterType, selectedDate])

  const hasChartData = chartCategories.length > 0

  const totalAmount = filteredByPeriod.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  const totalEntries = filteredByPeriod.length
  const averagePerEntry = totalEntries > 0 ? totalAmount / totalEntries : 0

  const periodLabel = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    if (filterType === 'monthly') return formatMonthYear(selectedDate)
    if (filterType === 'yearly') return `${ref.getFullYear()}`
    return ''
  }, [filterType, selectedDate])

  const handleAddExpense = () => { setEditingExpense(null); setShowModal(true) }
  const handleEditExpense = (expense) => { setEditingExpense(expense); setShowModal(true) }
  const handleCloseModal = () => { setShowModal(false); setEditingExpense(null) }
  const handleExport = () => exportToCSV(filteredExpenses, periodLabel)

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        .expense-input {
          padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 13px; font-family: Inter, sans-serif; background: #fff;
          transition: all 0.2s ease;
        }
        .expense-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .expense-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px; font-size: 13px;
          font-weight: 600; cursor: pointer; border: 1.5px solid #e5e7eb;
          background: #fff; color: #374151; transition: all 0.15s ease;
          font-family: Inter, sans-serif;
        }
        .expense-btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
        .expense-filter-btn {
          padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; transition: all 0.15s ease;
          font-family: Inter, sans-serif; background: transparent; color: #6b7280;
        }
        .expense-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 100;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 22px; border-radius: 50px; font-size: 14px; font-weight: 700;
          cursor: pointer; border: none; background: #16a34a; color: #fff;
          box-shadow: 0 6px 20px rgba(22,163,74,0.4), 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s ease; font-family: Inter, sans-serif;
          letter-spacing: -0.01em; white-space: nowrap;
        }
        .expense-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(22,163,74,0.45), 0 4px 8px rgba(0,0,0,0.15);
          background: #15803d;
        }
        .expense-fab:active { transform: translateY(0); box-shadow: 0 4px 12px rgba(22,163,74,0.3); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '100%', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a3a2a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px' }}>
                Expenses
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Subaybayan ang iyong gastos sa bawat kategorya</p>
            </div>
            {filteredExpenses.length > 0 && (
              <button className="expense-btn-secondary" onClick={handleExport}>
                <i className="ti ti-download" aria-hidden="true" /> Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px 100px' }}>
        {error && (
          <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}><strong>Error:</strong> {error}</p>
          </div>
        )}

        {/* ── SUMMARY CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500 }}>Total Expenses</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              ₱{formatCurrency(totalAmount)}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{periodLabel}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500 }}>Entries Logged</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {totalEntries}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{periodLabel}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500 }}>Average per Entry</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              ₱{formatCurrency(averagePerEntry)}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{periodLabel}</p>
          </div>
        </div>

        {/* ── LINE CHART + FILTER BAR (combined card) ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24, overflow: 'hidden' }}>
          {/* Top bar: title left, filters right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-chart-line" style={{ color: '#16a34a', fontSize: 18 }} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Gastos by Category
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{periodLabel}</span>
              </div>
            </div>

            {/* Period filter + date picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid #e5e7eb', padding: 4, background: '#f9fafb', gap: 4 }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterType(f.value)}
                    className="expense-filter-btn"
                    style={{
                      background: filterType === f.value ? '#fff' : 'transparent',
                      color: filterType === f.value ? '#16a34a' : '#6b7280',
                      boxShadow: filterType === f.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filterType === 'yearly' ? (
                <input
                  type="number"
                  value={new Date(selectedDate + 'T00:00:00').getFullYear()}
                  onChange={(e) => {
                    const year = parseInt(e.target.value)
                    if (!year) return
                    const d = new Date(selectedDate + 'T00:00:00')
                    d.setFullYear(year)
                    setSelectedDate(d.toISOString().split('T')[0])
                  }}
                  className="expense-input"
                  style={{ width: 90 }}
                />
              ) : (
                <input
                  type="month"
                  value={selectedDate.slice(0, 7)}
                  onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
                  className="expense-input"
                />
              )}
            </div>
          </div>

          {/* Chart body */}
          <div style={{ padding: '20px 20px 8px' }}>
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={filterType === 'monthly' ? 4 : 0}
                  />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(value) => <span style={{ color: '#374151', fontWeight: 600 }}>{value}</span>}
                  />
                  {chartCategories.map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Walang data para sa period na ito</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CATEGORY BREAKDOWN CARDS ── */}
        {categoryBreakdown.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {categoryBreakdown.map(([cat, total]) => {
              const color = getCategoryColor(cat)
              return (
                <div
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'All' : cat)}
                  style={{
                    background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f0f0f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.1)' }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 8, background: color.bg, color: color.text }}>
                    {cat}
                  </span>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    ₱{formatCurrency(total)}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                    {Math.round((total / totalAmount) * 100)}% of total
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── CATEGORY FILTER PILLS ── */}
        {availableCategories.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={() => setCategoryFilter('All')}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                  background: categoryFilter === 'All' ? '#16a34a' : '#f3f4f6',
                  color: categoryFilter === 'All' ? '#fff' : '#6b7280'
                }}
              >
                All
              </button>
              {availableCategories.map((cat) => {
                const color = getCategoryColor(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? 'All' : cat)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                      background: color.bg, color: color.text,
                      opacity: categoryFilter === cat ? 1 : 0.6
                    }}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="ti ti-loader-3" style={{ fontSize: 24, color: '#16a34a', animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Nag-load ng expenses...</p>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!isLoading && filteredExpenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0' }}>
            <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-receipt-off" style={{ fontSize: 32, color: '#d1d5db' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Walang gastos pa
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
              {categoryFilter !== 'All'
                ? `Walang gastos sa category na "${categoryFilter}" para sa period na ito.`
                : 'Walang naitalang gastos para sa period na ito.'}
            </p>
            {categoryFilter !== 'All' && (
              <button onClick={() => setCategoryFilter('All')} className="expense-btn-secondary">
                Show all categories
              </button>
            )}
          </div>
        )}

        {/* ── EXPENSES TABLE ── */}
        {!isLoading && filteredExpenses.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#6b7280' }}>Petsa</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#6b7280' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#6b7280' }}>Notes</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, idx) => {
                  const color = getCategoryColor(expense.category)
                  return (
                    <tr key={expense.id} style={{ borderBottom: idx < filteredExpenses.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <td style={{ padding: '12px 16px', color: '#111827', whiteSpace: 'nowrap' }}>
                        {formatDate(expense.expense_date)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color.bg, color: color.text }}>
                          {expense.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                        ₱{formatCurrency(expense.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {expense.notes || <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleEditExpense(expense)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                            background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
                            cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.15s ease',
                            fontFamily: 'Inter, sans-serif'
                          }}
                          onMouseOver={(e) => { e.target.style.background = '#e5e7eb' }}
                          onMouseOut={(e) => { e.target.style.background = '#f3f4f6' }}
                        >
                          <i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                  <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>
                    Total
                    {categoryFilter !== 'All' && (
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({categoryFilter})</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                    ₱{formatCurrency(filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── FLOATING ACTION BUTTON ── */}
      <button className="expense-fab" onClick={handleAddExpense}>
        <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 18 }} />
        Add Expenses
      </button>

      <AddExpenseModal
        isOpen={showModal}
        onClose={handleCloseModal}
        storeId={storeId}
        editingExpense={editingExpense}
      />
    </div>
  )
}