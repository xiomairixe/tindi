import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const EVENT_TYPES = [
  { value: 'page_view', label: 'Page Views', icon: 'ti-eye', color: '#16a34a' },
  { value: 'login', label: 'Logins', icon: 'ti-login', color: '#2563eb' },
  { value: 'registration', label: 'Registrations', icon: 'ti-user-plus', color: '#d97706' },
  { value: 'login_failed', label: 'Failed Logins', icon: 'ti-shield-x', color: '#dc2626' },
]

const PAGE_SIZE = 20

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return startOfDay(d)
}

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [trendData, setTrendData] = useState([])
  const [trendLoading, setTrendLoading] = useState(true)

  const [events, setEvents] = useState([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [logLoading, setLogLoading] = useState(true)
  const [page, setPage] = useState(0)

  const [filterType, setFilterType] = useState('all')
  const [filterRange, setFilterRange] = useState('7d')
  const [search, setSearch] = useState('')

  // ── Summary cards (Today / Week / Month counts per type) ──
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const ranges = { today: startOfDay(new Date()), week: daysAgo(7), month: daysAgo(30) }
      const result = {}

      for (const type of EVENT_TYPES) {
        result[type.value] = {}
        for (const [rangeKey, rangeStart] of Object.entries(ranges)) {
          const { count, error } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', type.value)
            .gte('created_at', rangeStart.toISOString())
          if (error) throw error
          result[type.value][rangeKey] = count || 0
        }
      }
      setSummary(result)
    } catch (err) {
      console.error('Error loading summary:', err)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  // ── Trend chart: daily counts for last 14 days ──
  const loadTrend = useCallback(async () => {
    setTrendLoading(true)
    try {
      const since = daysAgo(13)
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // build 14-day buckets
      const buckets = []
      for (let i = 13; i >= 0; i--) {
        const d = daysAgo(i)
        buckets.push({
          date: d,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          page_view: 0, login: 0, registration: 0, login_failed: 0,
        })
      }

      data.forEach(ev => {
        const evDate = startOfDay(new Date(ev.created_at)).getTime()
        const bucket = buckets.find(b => b.date.getTime() === evDate)
        if (bucket && bucket[ev.event_type] !== undefined) {
          bucket[ev.event_type] += 1
        }
      })

      setTrendData(buckets)
    } catch (err) {
      console.error('Error loading trend:', err)
    } finally {
      setTrendLoading(false)
    }
  }, [])

  // ── Detailed event log (paginated, filtered) ──
  const loadEvents = useCallback(async () => {
    setLogLoading(true)
    try {
      let query = supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (filterType !== 'all') {
        query = query.eq('event_type', filterType)
      }

      if (filterRange !== 'all') {
        const rangeMap = { today: startOfDay(new Date()), '7d': daysAgo(7), '30d': daysAgo(30) }
        const start = rangeMap[filterRange]
        if (start) query = query.gte('created_at', start.toISOString())
      }

      if (search.trim()) {
        query = query.or(`email.ilike.%${search.trim()}%,page_path.ilike.%${search.trim()}%`)
      }

      const { data, count, error } = await query
      if (error) throw error

      setEvents(data || [])
      setTotalEvents(count || 0)
    } catch (err) {
      console.error('Error loading events:', err)
    } finally {
      setLogLoading(false)
    }
  }, [page, filterType, filterRange, search])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadTrend() }, [loadTrend])
  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => { setPage(0) }, [filterType, filterRange, search])

  const maxTrendValue = Math.max(
    1,
    ...trendData.map(d => Math.max(d.page_view, d.login, d.registration, d.login_failed))
  )

  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE))

  const formatDate = (iso) => new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const typeMeta = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '28px 32px', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        .aa-card { background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; }
        .aa-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
        }
        .aa-input, .aa-select {
          font-family: Inter, sans-serif; font-size: 13px; padding: 8px 12px;
          border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #111827;
          outline: none;
        }
        .aa-input:focus, .aa-select:focus { border-color: #16a34a; }
        .aa-th {
          text-align: left; font-size: 11px; font-weight: 700; color: #6b7280;
          text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .aa-td { padding: 12px 14px; font-size: 13px; color: #111827; border-bottom: 1px solid #f3f4f6; }
        .aa-pagebtn {
          padding: 6px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff;
          font-size: 12px; font-weight: 600; color: #374151; cursor: pointer;
        }
        .aa-pagebtn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
          Landing page visitors, logins, at registrations monitoring
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {EVENT_TYPES.map(type => (
          <div key={type.value} className="aa-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${type.color}1a`, color: type.color, flexShrink: 0,
              }}>
                <i className={`ti ${type.icon}`} style={{ fontSize: 18 }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0 }}>{type.label}</p>
            </div>
            {summaryLoading ? (
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Loading...</p>
            ) : (
              <div style={{ display: 'flex', gap: 18 }}>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {summary?.[type.value]?.today ?? 0}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontWeight: 600 }}>TODAY</p>
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {summary?.[type.value]?.week ?? 0}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontWeight: 600 }}>7 DAYS</p>
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {summary?.[type.value]?.month ?? 0}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontWeight: 600 }}>30 DAYS</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Trend Chart ── */}
      <div className="aa-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Last 14 Days</p>
          <div style={{ display: 'flex', gap: 14 }}>
            {EVENT_TYPES.map(type => (
              <div key={type.value} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: type.color, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {trendLoading ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading chart...</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, overflowX: 'auto' }}>
            {trendData.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                  {EVENT_TYPES.map(type => (
                    <div
                      key={type.value}
                      title={`${type.label}: ${d[type.value]}`}
                      style={{
                        width: 7,
                        height: `${Math.max(2, (d[type.value] / maxTrendValue) * 120)}px`,
                        background: type.color,
                        borderRadius: '2px 2px 0 0',
                        opacity: d[type.value] === 0 ? 0.15 : 1,
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detailed Event Log ── */}
      <div className="aa-card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Event Log</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="aa-input"
              placeholder="Search email or page..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <select className="aa-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select className="aa-select" value={filterRange} onChange={e => setFilterRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="aa-th">Type</th>
                <th className="aa-th">Email</th>
                <th className="aa-th">Page</th>
                <th className="aa-th">Referrer</th>
                <th className="aa-th">Date</th>
              </tr>
            </thead>
            <tbody>
              {logLoading ? (
                <tr><td className="aa-td" colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
              ) : events.length === 0 ? (
                <tr><td className="aa-td" colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>Walang events na nakita.</td></tr>
              ) : (
                events.map(ev => {
                  const meta = typeMeta(ev.event_type)
                  return (
                    <tr key={ev.id}>
                      <td className="aa-td">
                        <span className="aa-badge" style={{ background: `${meta.color}1a`, color: meta.color }}>
                          <i className={`ti ${meta.icon}`} style={{ fontSize: 12 }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="aa-td">{ev.email || '—'}</td>
                      <td className="aa-td" style={{ fontFamily: 'monospace', fontSize: 12 }}>{ev.page_path || '—'}</td>
                      <td className="aa-td" style={{ color: '#6b7280', fontSize: 12 }}>{ev.referrer || 'Direct'}</td>
                      <td className="aa-td" style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(ev.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #e5e7eb',
        }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            {totalEvents} total events • Page {page + 1} of {totalPages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="aa-pagebtn" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
              Previous
            </button>
            <button className="aa-pagebtn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}