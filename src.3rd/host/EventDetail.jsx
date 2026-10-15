import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../supabaseClient'
import { formatDateTime, money, publicEventUrl } from '../lib/format'

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [stats, setStats] = useState(null)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
    if (error) return setError(error.message)
    setEv(data)
    const { data: s } = await supabase.rpc('host_event_stats', { p_event_id: id })
    setStats(s)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const url = ev ? publicEventUrl(ev.slug) : ''

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, { width: 640, margin: 2 }).then(setQr)
  }, [url])

  async function setStatus(status) {
    setError('')
    if (status === 'published' && !ev.bank_details?.trim()) {
      return setError('Add your bank details (Edit event) before publishing.')
    }
    setBusy(true)
    const { error } = await supabase.from('events').update({ status }).eq('id', id)
    setBusy(false)
    if (error) return setError(error.message)
    load()
  }

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (error && !ev) return <p className="error">{error}</p>
  if (!ev) return <p className="muted">Loading…</p>

  const cur = ev.currency

  return (
    <div className="stack">
      <Link to="/host" className="small-link">← All events</Link>

      <div className="row between wrap">
        <div>
          <h1>{ev.title}</h1>
          <p className="muted">{formatDateTime(ev.starts_at)}</p>
          {(ev.venue_name || ev.venue_address) && (
            <p className="muted">{[ev.venue_name, ev.venue_address].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <span className={`badge ${ev.status}`}>{ev.status}</span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="row wrap">
        <Link
          to={`/host/events/${id}/orders`}
          className={stats?.orders_awaiting_review > 0 ? 'btn primary' : 'btn'}
        >
          Payments{stats?.orders_awaiting_review > 0 ? ` (${stats.orders_awaiting_review} to review)` : ''}
        </Link>
        <Link to={`/host/events/${id}/edit`} className="btn">Edit event</Link>
        {ev.status !== 'published' ? (
          <button className="btn primary" disabled={busy} onClick={() => setStatus('published')}>
            Publish (start selling)
          </button>
        ) : (
          <button className="btn" disabled={busy} onClick={() => setStatus('closed')}>
            Close sales
          </button>
        )}
      </div>

      <section className="card stack">
        <h2>Overview</h2>
        <div className="stats">
          <Stat label="Tickets left" value={stats ? stats.remaining : '…'} />
          <Stat label="Tickets confirmed" value={stats ? stats.tickets_confirmed : '…'} />
          <Stat label="Payments to review" value={stats ? stats.orders_awaiting_review : '…'} />
          <Stat label="Money confirmed" value={stats ? money(stats.amount_confirmed, cur) : '…'} />
          <Stat label="Money pending" value={stats ? money(stats.amount_pending, cur) : '…'} />
          <Stat label="Checked in" value={stats ? stats.checked_in : '…'} />
        </div>
        <p className="muted small">
          {money(ev.ticket_price, cur)} per ticket · {ev.capacity} tickets in total · sales close {formatDateTime(ev.sales_deadline)}
        </p>
      </section>

      <section className="card stack">
        <h2>Share with customers</h2>
        {ev.status !== 'published' && (
          <p className="notice">
            This event is <strong>{ev.status}</strong>, so the link below won't show it to customers yet. Publish it first.
          </p>
        )}
        <div className="row">
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        </div>
        {qr && (
          <div className="qr-box">
            <img src={qr} alt="QR code for the event page" width="200" height="200" />
            <div className="stack-sm">
              <p className="muted small">Put this on your posters and social media. It opens the event page.</p>
              <a className="btn" href={qr} download={`${ev.slug}-qr.png`}>Download QR code</a>
            </div>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2>Coming next</h2>
        <p className="muted">
          The ticket scanner and guest list will appear here as we build them.
        </p>
      </section>
    </div>
  )
}
