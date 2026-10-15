import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { downloadCsv } from '../lib/csv'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Not yet in' },
  { key: 'in', label: 'Checked in' },
]

export default function GuestListPage() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [busyCode, setBusyCode] = useState('')

  const load = useCallback(async () => {
    const [{ data: e }, { data, error }] = await Promise.all([
      supabase.from('events').select('title, slug').eq('id', id).single(),
      supabase
        .from('tickets')
        .select('id, code, holder_name, status, checked_in_at, order:orders(reference, buyer_email, buyer_phone, is_complimentary)')
        .eq('event_id', id)
        .order('holder_name', { ascending: true }),
    ])
    if (error) return setError(error.message)
    setEv(e)
    setRows(data)
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 20000) // keeps several door staff in sync
    return () => clearInterval(t)
  }, [load])

  async function manualCheckIn(row) {
    if (!window.confirm(`Check in ${row.holder_name} (${row.code})?`)) return
    setBusyCode(row.code)
    const { data, error } = await supabase.rpc('check_in_ticket', { p_token: row.code, p_event_id: id })
    setBusyCode('')
    if (error) return setError(error.message)
    if (data.result !== 'ok') setError(`Not checked in: ${data.result.replace(/_/g, ' ')}`)
    else setError('')
    load()
  }

  const visible = useMemo(() => {
    if (!rows) return []
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'pending' && r.status !== 'valid') return false
      if (filter === 'in' && r.status !== 'checked_in') return false
      if (!q) return true
      return [r.holder_name, r.code, r.order?.reference, r.order?.buyer_phone, r.order?.buyer_email]
        .some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [rows, search, filter])

  function exportCsv() {
    const header = ['Name', 'Ticket code', 'Order reference', 'Phone', 'Email', 'Type', 'Status', 'Checked in at']
    const data = rows.map((r) => [
      r.holder_name,
      r.code,
      r.order?.reference,
      r.order?.buyer_phone === '-' ? '' : r.order?.buyer_phone,
      r.order?.buyer_email,
      r.order?.is_complimentary ? 'Free' : 'Paid',
      r.status === 'checked_in' ? 'Checked in' : r.status === 'void' ? 'Cancelled' : 'Not yet in',
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '',
    ])
    downloadCsv(`guest-list-${ev?.slug || 'event'}.csv`, [header, ...data])
  }

  if (!rows) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>

  const total = rows.filter((r) => r.status !== 'void').length
  const inCount = rows.filter((r) => r.status === 'checked_in').length

  return (
    <div className="stack">
      <Link to={`/host/events/${id}`} className="small-link">← Back to event</Link>
      <div className="row between wrap">
        <div>
          <h1>Guest list</h1>
          <p className="muted">{ev?.title} · {inCount} of {total} checked in</p>
        </div>
        <button className="btn" onClick={exportCsv} disabled={!rows.length}>Download CSV</button>
      </div>

      <p className="notice">
        Tip: download the CSV before the event and keep a copy on your phone in case the signal drops at the venue.
      </p>
      {error && <p className="error">{error}</p>}

      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Search by name, ticket code, reference, phone or email…" />
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card center"><p className="muted">{rows.length ? 'No guests match.' : 'No tickets issued yet.'}</p></div>
      )}

      <div className="stack-sm">
        {visible.map((r) => (
          <div key={r.id} className="card guest-row">
            <div>
              <strong>{r.holder_name}</strong>
              <div className="muted small">
                <span className="ref-small">{r.code}</span> · {r.order?.reference}
                {r.order?.is_complimentary ? ' · Free' : ''}
              </div>
              {r.order?.buyer_phone && r.order.buyer_phone !== '-' && (
                <div className="muted small">{r.order.buyer_phone}</div>
              )}
            </div>
            <div className="guest-actions">
              {r.status === 'checked_in' ? (
                <span className="status confirmed">
                  In · {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : r.status === 'void' ? (
                <span className="status rejected">Cancelled</span>
              ) : (
                <button className="btn primary small" disabled={busyCode === r.code} onClick={() => manualCheckIn(r)}>
                  Check in
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
