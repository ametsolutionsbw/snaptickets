import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Search } from 'lucide-react'
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
      r.holder_name, r.code, r.order?.reference,
      r.order?.buyer_phone === '-' ? '' : r.order?.buyer_phone,
      r.order?.buyer_email,
      r.order?.is_complimentary ? 'Free' : 'Paid',
      r.status === 'checked_in' ? 'Checked in' : r.status === 'void' ? 'Cancelled' : 'Not yet in',
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '',
    ])
    downloadCsv(`guest-list-${ev?.slug || 'event'}.csv`, [header, ...data])
  }

  if (!rows) return error ? <p className="note note-red">{error}</p> : <p className="text-sm text-ink3">Loading…</p>

  const total = rows.filter((r) => r.status !== 'void').length
  const inCount = rows.filter((r) => r.status === 'checked_in').length

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to={`/host/events/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 no-underline hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to event
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl lg:text-4xl">Guest list</h1>
          <p className="text-sm text-ink2">{ev?.title} · {inCount} of {total} checked in</p>
        </div>
        <button className="btn" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>

      <p className="note note-amber">
        Tip: download the CSV before the event and keep a copy on your phone in case the signal drops at the venue.
      </p>
      {error && <p className="note note-red">{error}</p>}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
        <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)}
               placeholder="Search by name, ticket code, reference, phone or email…" />
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} className={`tab ${filter === f.key ? 'tab-active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink3">{rows.length ? 'No guests match.' : 'No tickets issued yet.'}</div>
      )}

      <div className="space-y-2">
        {visible.length > 0 && (
          <div className="hidden px-4 text-[11px] font-bold uppercase tracking-wider text-ink3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_110px] md:gap-4">
            <span>Guest</span><span>Ticket / order</span><span>Contact</span><span className="text-right">Status</span>
          </div>
        )}
        {visible.map((r) => (
          <div key={r.id}
               className="card flex flex-col gap-3 px-4 py-3.5 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_110px] md:items-center md:gap-4">
            <div className="min-w-0">
              <div className="truncate font-semibold">{r.holder_name}</div>
              <div className="truncate text-xs text-ink3">{r.order?.is_complimentary ? 'Free ticket' : r.order?.buyer_email}</div>
            </div>
            <div className="text-xs text-ink3">
              <span className="font-mono text-sm font-semibold text-ink2">{r.code}</span>
              <div>{r.order?.reference}</div>
            </div>
            <div className="truncate text-xs text-ink3">
              {r.order?.buyer_phone && r.order.buyer_phone !== '-' ? r.order.buyer_phone : '—'}
            </div>
            <div className="md:text-right">
              {r.status === 'checked_in' ? (
                <span className="pill pill-green">
                  In · {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : r.status === 'void' ? (
                <span className="pill pill-red">Cancelled</span>
              ) : (
                <button className="btn btn-primary btn-sm" disabled={busyCode === r.code} onClick={() => manualCheckIn(r)}>
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
