import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import { useSalesStore } from '../../stores/salesStore'
import AddSaleModal from './components/AddSaleModal'

const FILTERS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const todayStr = () => new Date().toISOString().split('T')[0]

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatMonthYear = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

const formatPeso = (value) => {
  return parseFloat(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
        <p style={{ color: '#6b7280', margin: 0 }}>₱{formatPeso(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function SalesPage() {
  const { storeId, isLoading: authLoading } = useAuthStore()
  const { sales, isLoading, error, fetchSales } = useSalesStore()

  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [filterType, setFilterType] = useState('monthly')
  const [selectedDate, setSelectedDate] = useState(todayStr())

  useEffect(() => {
    if (authLoading) return
    if (!storeId) return
    fetchSales(storeId)
  }, [storeId, authLoading])

  const filteredSales = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    return sales.filter((sale) => {
      const saleDate = new Date(sale.sale_date + 'T00:00:00')
      if (filterType === 'monthly') {
        return saleDate.getFullYear() === ref.getFullYear() && saleDate.getMonth() === ref.getMonth()
      }
      if (filterType === 'yearly') {
        return saleDate.getFullYear() === ref.getFullYear()
      }
      return true
    })
  }, [sales, filterType, selectedDate])

  const chartData = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    if (filterType === 'monthly') {
      const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      const dailyMap = {}
      for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        dailyMap[dateKey] = 0
      }
      filteredSales.forEach((sale) => {
        dailyMap[sale.sale_date] = (dailyMap[sale.sale_date] || 0) + parseFloat(sale.amount || 0)
      })
      return Object.entries(dailyMap).map(([date, amount]) => ({
        label: new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { day: 'numeric' }),
        amount: parseFloat(amount.toFixed(2)),
      }))
    }
    if (filterType === 'yearly') {
      const monthlyMap = {}
      for (let i = 0; i < 12; i++) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthlyMap[monthNames[i]] = 0
      }
      filteredSales.forEach((sale) => {
        const saleDate = new Date(sale.sale_date + 'T00:00:00')
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][saleDate.getMonth()]
        monthlyMap[monthName] += parseFloat(sale.amount || 0)
      })
      return Object.entries(monthlyMap).map(([month, amount]) => ({
        label: month,
        amount: parseFloat(amount.toFixed(2)),
      }))
    }
    return []
  }, [filteredSales, filterType, selectedDate])

  const totalAmount = filteredSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  const totalEntries = filteredSales.length
  const averagePerEntry = totalEntries > 0 ? totalAmount / totalEntries : 0

  const periodLabel = useMemo(() => {
    const ref = new Date(selectedDate + 'T00:00:00')
    if (filterType === 'monthly') return formatMonthYear(selectedDate)
    if (filterType === 'yearly') return `${ref.getFullYear()}`
    return ''
  }, [filterType, selectedDate])

  const handleAddSale = () => { setEditingSale(null); setShowModal(true) }
  const handleEditSale = (sale) => { setEditingSale(sale); setShowModal(true) }
  const handleCloseModal = () => { setShowModal(false); setEditingSale(null) }

  const FilterControls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid #e5e7eb', padding: 4, background: '#f9fafb', gap: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value)}
            className="sales-filter-btn"
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
          className="sales-input"
          style={{ width: 90 }}
        />
      ) : (
        <input
          type="month"
          value={selectedDate.slice(0, 7)}
          onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
          className="sales-input"
        />
      )}
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh', position: 'relative' }}>
      <style>{`
        .sales-input {
          padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 13px; font-family: Inter, sans-serif; background: #fff;
          transition: all 0.2s ease;
        }
        .sales-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .sales-filter-btn {
          padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; transition: all 0.15s ease;
          font-family: Inter, sans-serif; background: transparent; color: #6b7280;
        }
        .sales-filter-btn:hover { color: #374151; }
        .sales-row {
          transition: background 0.12s ease;
        }
        .sales-row:hover {
          background: #f0fdf4 !important;
        }
        .edit-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; background: transparent; color: #6b7280;
          border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer;
          font-weight: 600; font-size: 12px; transition: all 0.15s ease;
          font-family: Inter, sans-serif;
        }
        .edit-btn:hover {
          background: #f0fdf4; color: #16a34a; border-color: #bbf7d0;
        }
        .sales-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 50;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 22px; border-radius: 999px; font-size: 14px;
          font-weight: 700; cursor: pointer; border: none;
          background: #16a34a; color: #fff;
          box-shadow: 0 8px 24px rgba(22,163,74,0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          font-family: Inter, sans-serif;
        }
        .sales-fab:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 28px rgba(22,163,74,0.45);
        }
        .sales-fab i { font-size: 18px; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a3a2a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px' }}>
            Sales
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Subaybayan ang iyong benta araw-araw</p>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {error && (
          <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}><strong>Error:</strong> {error}</p>
          </div>
        )}

        {/* ── SUMMARY CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Sales', value: `₱${formatPeso(totalAmount)}`, color: '#16a34a', icon: 'ti-trending-up', iconBg: '#dcfce7', iconColor: '#16a34a' },
            { label: 'Entries Logged', value: totalEntries.toLocaleString('en-PH'), color: '#111827', icon: 'ti-list', iconBg: '#f0f9ff', iconColor: '#0ea5e9' },
            { label: 'Average per Entry', value: `₱${formatPeso(averagePerEntry)}`, color: '#111827', icon: 'ti-calculator', iconBg: '#fef9c3', iconColor: '#ca8a04' },
          ].map((card) => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 14, padding: '16px 20px',
              border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${card.icon}`} style={{ fontSize: 20, color: card.iconColor }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: card.color, margin: '0 0 2px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{card.value}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{periodLabel}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CHART ── */}
        {!isLoading && filteredSales.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-chart-line" style={{ color: '#16a34a', fontSize: 18 }} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Sales Trend — {periodLabel}
                </h2>
              </div>
              <FilterControls />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `₱${(v / 1000).toLocaleString('en-PH')}k` : `₱${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#16a34a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── LOADING ── */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="ti ti-loader-3" style={{ fontSize: 24, color: '#16a34a', animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Nag-load ng sales...</p>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!isLoading && filteredSales.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <FilterControls />
            </div>
            <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-receipt" style={{ fontSize: 32, color: '#d1d5db' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Walang benta pa
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
              Walang naitalang benta para sa period na ito.
            </p>
          </div>
        )}

        {/* ── SALES TABLE ── */}
        {!isLoading && filteredSales.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            {/* Table header bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1.5px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-receipt" style={{ color: '#16a34a', fontSize: 16 }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Mga Benta
                </p>
                <span style={{
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                  padding: '2px 8px',
                }}>
                  {totalEntries}
                </span>
              </div>
              <FilterControls />
            </div>

            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0' }}>Petsa</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0' }}>Notes</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, idx) => (
                  <tr
                    key={sale.id}
                    className="sales-row"
                    style={{ borderBottom: idx < filteredSales.length - 1 ? '1px solid #f5f5f5' : 'none', background: '#fff' }}
                  >
                    <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#16a34a', flexShrink: 0,
                          boxShadow: '0 0 0 3px rgba(22,163,74,0.12)',
                        }} />
                        <span style={{ color: '#111827', fontWeight: 500 }}>{formatDate(sale.sale_date)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#f0fdf4', color: '#15803d',
                        border: '1px solid #dcfce7',
                        borderRadius: 8, padding: '3px 10px',
                        fontWeight: 700, fontSize: 13,
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                      }}>
                        ₱{formatPeso(sale.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#6b7280', maxWidth: 260 }}>
                      {sale.notes
                        ? <span style={{ color: '#374151' }}>{sale.notes}</span>
                        : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Walang notes</span>
                      }
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                      <button className="edit-btn" onClick={() => handleEditSale(sale)}>
                        <i className="ti ti-edit" style={{ fontSize: 13 }} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f9fafb', borderTop: '1.5px solid #e5e7eb' }}>
                  <td style={{ padding: '13px 20px', fontWeight: 700, color: '#374151', fontSize: 13 }}>
                    Total — {totalEntries} entry{totalEntries !== 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#16a34a', color: '#fff',
                      borderRadius: 8, padding: '4px 12px',
                      fontWeight: 800, fontSize: 14,
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}>
                      ₱{formatPeso(totalAmount)}
                    </span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button className="sales-fab" onClick={handleAddSale}>
        <i className="ti ti-plus" aria-hidden="true" /> Add Record
      </button>

      <AddSaleModal
        isOpen={showModal}
        onClose={handleCloseModal}
        storeId={storeId}
        editingSale={editingSale}
      />
    </div>
  )
}