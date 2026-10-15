import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { formatDateTime, money } from '../lib/format'
import { whatsappUrl } from '../lib/contact'
import {
  confirmationContent, rejectionContent, sendEmail, orderLink, emailConfigured,
} from '../lib/email'
import CopyButton from '../components/CopyButton.jsx'

const TABS = [
  { key: 'review', label: 'To review', match: (o) => o.status === 'proof_uploaded' },
  { key: 'awaiting', label: 'Awaiting payment', match: (o) => o.status === 'pending_payment' },
  { key: 'confirmed', label: 'Confirmed', match: (o) => o.status === 'confirmed' },
  { key: 'closed', label: 'Rejected / expired', match: (o) => o.status === 'rejected' || o.status === 'expired' },
  { key: 'all', label: 'All', match: () => true },
]

const STATUS_LABEL = {
  pending_payment: 'Awaiting payment',
  proof_uploaded: 'Proof uploaded',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
}

const QUICK_REASONS = [
  'We could not find this payment in our bank account.',
  'The amount paid does not match the order total.',
  'The proof of payment is unreadable. Please upload a clearer one.',
]

function OrderCard({ o, ev, proofUrl, busy, onApprove, onReject, onResend }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const isPdf = o.proof_path?.toLowerCase().endsWith('.pdf')
  const canReject = o.status === 'pending_payment' || o.status === 'proof_uploaded'
  const canApprove = canReject || o.status === 'rejected' || o.status === 'expired'
  const approveLabel =
    o.status === 'proof_uploaded' ? 'Approve payment'
    : o.status === 'pending_payment' ? 'Mark as paid'
    : 'Approve anyway'

  return (
    <div className="card stack">
      <div className="row between wrap">
        <div className="row wrap">
          <span className="ref-small">{o.reference}</span>
          <span className={`status ${o.status}`}>{STATUS_LABEL[o.status]}</span>
          {o.is_complimentary && <span className="status free">Free ticket</span>}
        </div>
        <span className="muted small">{formatDateTime(o.created_at)}</span>
      </div>

      <div className="order-grid">
        <div>
          <div className="muted small">Amount to match in bank</div>
          <div className="big">{money(o.total_amount, ev.currency)}</div>
          <div className="muted small">{o.quantity} × {money(ev.ticket_price, ev.currency)}</div>
        </div>
        <div>
          <div className="muted small">Ordered by</div>
          <div><strong>{o.buyer_name}</strong></div>
          <div className="small">{o.buyer_phone !== '-' && <a href={`tel:${o.buyer_phone}`}>{o.buyer_phone}</a>}</div>
          <div className="small muted">{o.buyer_email}</div>
        </div>
        <div>
          <div className="muted small">Name on paying account</div>
          <div><strong>{o.payer_name || '—'}</strong></div>
        </div>
      </div>

      {o.proof_path && (
        <div className="proof">
          {proofUrl ? (
            isPdf ? (
              <a className="btn" href={proofUrl} target="_blank" rel="noreferrer">Open proof (PDF)</a>
            ) : (
              <a href={proofUrl} target="_blank" rel="noreferrer" title="Open full size">
                <img src={proofUrl} alt="Proof of payment" className="proof-img" />
              </a>
            )
          ) : (
            <span className="muted small">Loading proof…</span>
          )}
        </div>
      )}

      {o.status === 'rejected' && o.reject_reason && (
        <p className="muted small">Rejected: {o.reject_reason}</p>
      )}

      {rejecting ? (
        <div className="stack-sm reject-box">
          <strong>Why are you rejecting this? The customer will see it.</strong>
          <div className="row wrap">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button" className="chip" onClick={() => setReason(r)}>{r}</button>
            ))}
          </div>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" />
          <div className="row">
            <button className="btn danger" disabled={busy || !reason.trim()}
                    onClick={() => onReject(o, reason.trim())}>
              {busy ? 'Rejecting…' : 'Reject order'}
            </button>
            <button className="btn ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row wrap">
          {canApprove && (
            <button className="btn primary" disabled={busy} onClick={() => onApprove(o)}>
              {busy ? 'Working…' : approveLabel}
            </button>
          )}
          {canReject && (
            <button className="btn" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
          )}
          {o.status === 'confirmed' && (
            <>
              <button className="btn" disabled={busy} onClick={() => onResend(o)}>Resend email</button>
              <CopyButton text={orderLink(o.access_token)} label="Copy ticket link" />
              {whatsappUrl(o.buyer_phone, '') && (
                <a className="btn small" target="_blank" rel="noreferrer"
                   href={whatsappUrl(o.buyer_phone, `Hi ${o.buyer_name.split(' ')[0]}, here is your ticket for ${ev.title}: ${orderLink(o.access_token)}`)}>
                  Send on WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ComplimentaryForm({ eventId, onIssued }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', qty: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = await supabase.rpc('issue_complimentary', {
      p_event_id: eventId,
      p_name: f.name,
      p_email: f.email,
      p_quantity: Number(f.qty),
      p_phone: f.phone || null,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setF({ name: '', email: '', phone: '', qty: 1 })
    onIssued(data, f.phone)
  }

  return (
    <details className="card">
      <summary><strong>Issue free tickets</strong> <span className="muted small">(performers, guests, sponsors)</span></summary>
      <form className="stack" style={{ marginTop: 14 }} onSubmit={submit}>
        <div className="grid2">
          <label>Name<input value={f.name} onChange={set('name')} required /></label>
          <label>Number of tickets
            <input type="number" min="1" max="20" value={f.qty} onChange={set('qty')} required />
          </label>
          <label>Email (optional)<input type="email" value={f.email} onChange={set('email')} /></label>
          <label>Phone (optional)<input type="tel" value={f.phone} onChange={set('phone')} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div><button className="btn primary" disabled={busy}>{busy ? 'Issuing…' : 'Issue tickets'}</button></div>
      </form>
    </details>
  )
}

export default function OrdersPage() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [orders, setOrders] = useState(null)
  const [proofUrls, setProofUrls] = useState({})
  const [tab, setTab] = useState('review')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    const [{ data: e, error: e1 }, { data: o, error: e2 }] = await Promise.all([
      supabase.from('events').select('id, title, currency, ticket_price').eq('id', id).single(),
      supabase.from('orders').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    ])
    if (e1 || e2) return setLoadError((e1 || e2).message)
    setEv(e)
    setOrders(o)

    const paths = o.filter((x) => x.proof_path).map((x) => x.proof_path)
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('proofs').createSignedUrls(paths, 3600)
      const map = {}
      signed?.forEach((s) => { if (s.signedUrl) map[s.path] = s.signedUrl })
      setProofUrls(map)
    }
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  // Emails the customer; if that fails, still gives the host a way to deliver the link.
  async function emailCustomer({ content, d, phone, okText }) {
    const link = orderLink(d.access_token)
    const wa = whatsappUrl(phone, `${content.message}\n\n${link}`)
    try {
      await sendEmail({
        to_email: d.buyer_email,
        to_name: d.buyer_name,
        subject: content.subject,
        message: content.message,
        order_link: link,
        event_title: d.event_title,
      })
      setNotice({ type: 'ok', text: `${okText} Email sent to ${d.buyer_email}.`, link, wa })
    } catch (err) {
      const why = err?.text || err?.message || 'unknown error'
      setNotice({
        type: 'warn',
        text: `${okText} But the email could not be sent (${why}). Send the customer their link yourself:`,
        link, wa,
      })
    }
  }

  async function approve(o) {
    const ok = window.confirm(
      `Confirm that you received ${money(o.total_amount, ev.currency)} from ${o.payer_name || o.buyer_name} (reference ${o.reference})?\n\nThis will issue ${o.quantity} ticket(s) and email the customer.`
    )
    if (!ok) return
    setBusyId(o.id)
    setNotice(null)
    const { data, error } = await supabase.rpc('approve_order', { p_order_id: o.id })
    if (error) {
      setBusyId(null)
      return setNotice({ type: 'error', text: error.message })
    }
    await emailCustomer({
      content: confirmationContent({
        name: data.buyer_name, eventTitle: data.event_title,
        reference: data.reference, quantity: data.quantity,
      }),
      d: data, phone: o.buyer_phone, okText: `${o.reference} approved.`,
    })
    setBusyId(null)
    load()
  }

  async function reject(o, reason) {
    setBusyId(o.id)
    setNotice(null)
    const { data, error } = await supabase.rpc('reject_order', { p_order_id: o.id, p_reason: reason })
    if (error) {
      setBusyId(null)
      return setNotice({ type: 'error', text: error.message })
    }
    await emailCustomer({
      content: rejectionContent({
        name: data.buyer_name, eventTitle: ev.title, reference: data.reference, reason: data.reject_reason,
      }),
      d: { ...data, event_title: ev.title }, phone: o.buyer_phone, okText: `${o.reference} rejected.`,
    })
    setBusyId(null)
    load()
  }

  async function resend(o) {
    setBusyId(o.id)
    setNotice(null)
    await emailCustomer({
      content: confirmationContent({
        name: o.buyer_name, eventTitle: ev.title, reference: o.reference, quantity: o.quantity,
      }),
      d: { ...o, event_title: ev.title }, phone: o.buyer_phone, okText: 'Done.',
    })
    setBusyId(null)
  }

  async function afterComplimentary(data, phone) {
    if (data.buyer_email) {
      await emailCustomer({
        content: confirmationContent({
          name: data.buyer_name, eventTitle: data.event_title,
          reference: data.reference, quantity: data.quantity,
        }),
        d: data, phone, okText: `Free ${data.quantity === 1 ? 'ticket' : 'tickets'} issued to ${data.buyer_name}.`,
      })
    } else {
      setNotice({
        type: 'ok',
        text: `Free ${data.quantity === 1 ? 'ticket' : 'tickets'} issued to ${data.buyer_name}. No email was given, so share their link:`,
        link: orderLink(data.access_token),
        wa: whatsappUrl(phone, `Here is your ticket for ${data.event_title}: ${orderLink(data.access_token)}`),
      })
    }
    load()
  }

  const counts = useMemo(() => {
    const c = {}
    TABS.forEach((t) => { c[t.key] = (orders || []).filter(t.match).length })
    return c
  }, [orders])

  const visible = useMemo(() => {
    if (!orders) return []
    const q = search.trim().toLowerCase()
    if (q) {
      return orders.filter((o) =>
        [o.reference, o.buyer_name, o.payer_name, o.buyer_phone, o.buyer_email]
          .some((v) => (v || '').toLowerCase().includes(q))
      )
    }
    return orders.filter(TABS.find((t) => t.key === tab).match)
  }, [orders, tab, search])

  if (loadError) return <p className="error">{loadError}</p>
  if (!ev || !orders) return <p className="muted">Loading…</p>

  return (
    <div className="stack">
      <Link to={`/host/events/${id}`} className="small-link">← Back to {ev.title}</Link>
      <div className="row between wrap">
        <h1>Payments</h1>
        <button className="btn ghost" onClick={load}>Refresh</button>
      </div>

      {!emailConfigured && (
        <p className="notice">
          Email isn't set up yet, so confirmations won't be emailed. You can still copy each customer's ticket link
          or send it on WhatsApp. See the EmailJS steps to switch email on.
        </p>
      )}

      {notice && (
        <div className={notice.type === 'error' ? 'error' : notice.type === 'ok' ? 'notice ok' : 'notice'}>
          <div className="row between wrap">
            <span>{notice.text}</span>
            <button className="btn ghost small" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
          {notice.link && (
            <div className="row wrap" style={{ marginTop: 8 }}>
              <CopyButton text={notice.link} label="Copy ticket link" />
              {notice.wa && <a className="btn small" href={notice.wa} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
            </div>
          )}
        </div>
      )}

      <ComplimentaryForm eventId={id} onIssued={afterComplimentary} />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by reference, name, phone or email (searches all orders)…"
      />

      {!search && (
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span className="count">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="card center">
          <p className="muted">{search ? 'No orders match your search.' : 'Nothing here yet.'}</p>
        </div>
      )}

      {visible.map((o) => (
        <OrderCard
          key={o.id}
          o={o}
          ev={ev}
          proofUrl={proofUrls[o.proof_path]}
          busy={busyId === o.id}
          onApprove={approve}
          onReject={reject}
          onResend={resend}
        />
      ))}
    </div>
  )
}
