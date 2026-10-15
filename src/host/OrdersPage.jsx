import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageCircle, Search } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDateTime, money } from '../lib/format'
import { whatsappUrl } from '../lib/contact'
import { confirmationContent, rejectionContent, sendEmail, orderLink, emailConfigured } from '../lib/email'
import CopyButton from '../components/CopyButton.jsx'
import { StatusPill } from '../components/ui.jsx'

const TABS = [
  { key: 'review', label: 'To review', match: (o) => o.status === 'proof_uploaded' },
  { key: 'awaiting', label: 'Awaiting payment', match: (o) => o.status === 'pending_payment' },
  { key: 'confirmed', label: 'Confirmed', match: (o) => o.status === 'confirmed' },
  { key: 'closed', label: 'Rejected / expired', match: (o) => o.status === 'rejected' || o.status === 'expired' },
  { key: 'all', label: 'All', match: () => true },
]

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
    o.status === 'proof_uploaded' ? 'Approve payment' : o.status === 'pending_payment' ? 'Mark as paid' : 'Approve anyway'

  return (
    <div className={`card grid gap-x-6 gap-y-4 p-5 ${o.proof_path ? 'md:grid-cols-[minmax(0,1fr)_240px]' : ''}`}>
      <div className="space-y-4 md:col-start-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-wide">{o.reference}</span>
          <StatusPill status={o.status} />
          {o.is_complimentary && <span className="pill pill-brand">Free ticket</span>}
        </div>
        <span className="text-xs text-ink3">{formatDateTime(o.created_at)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <div className="kicker">Amount to match</div>
          <div className="mt-0.5 text-xl font-bold tracking-tight">{money(o.total_amount, ev.currency)}</div>
          <div className="text-xs text-ink3">{o.quantity} × {money(ev.ticket_price, ev.currency)}</div>
        </div>
        <div className="min-w-0">
          <div className="kicker">Ordered by</div>
          <div className="mt-0.5 text-sm font-semibold">{o.buyer_name}</div>
          {o.buyer_phone !== '-' && <a href={`tel:${o.buyer_phone}`} className="block text-xs">{o.buyer_phone}</a>}
          <div className="truncate text-xs text-ink3">{o.buyer_email}</div>
        </div>
        <div>
          <div className="kicker">Name on paying account</div>
          <div className="mt-0.5 text-sm font-semibold">{o.payer_name || '—'}</div>
        </div>
      </div>

      </div>

      {o.proof_path && (
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          {proofUrl ? (
            isPdf ? (
              <a className="btn btn-sm" href={proofUrl} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" /> Open proof (PDF)
              </a>
            ) : (
              <a href={proofUrl} target="_blank" rel="noreferrer" title="Open full size">
                <img src={proofUrl} alt="Proof of payment" className="max-h-64 w-full rounded-xl border border-line object-cover object-top md:max-h-72" />
              </a>
            )
          ) : (
            <span className="text-xs text-ink3">Loading proof…</span>
          )}
        </div>
      )}

      <div className="space-y-3 md:col-start-1">
      {o.status === 'rejected' && o.reject_reason && (
        <p className="text-xs text-ink3">Rejected: {o.reject_reason}</p>
      )}

      {rejecting ? (
        <div className="space-y-3 rounded-xl border border-red-100 bg-[#fdf6f4] p-4">
          <p className="text-sm font-bold">Why are you rejecting this? The customer will see it.</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs transition hover:border-brand-700">
                {r}
              </button>
            ))}
          </div>
          <textarea rows={2} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" />
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" disabled={busy || !reason.trim()} onClick={() => onReject(o, reason.trim())}>
              {busy ? 'Rejecting…' : 'Reject order'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onApprove(o)}>
              {busy ? 'Working…' : approveLabel}
            </button>
          )}
          {canReject && (
            <button className="btn btn-sm" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
          )}
          {o.status === 'confirmed' && (
            <>
              <button className="btn btn-sm" disabled={busy} onClick={() => onResend(o)}>Resend email</button>
              <CopyButton text={orderLink(o.access_token)} label="Copy ticket link" />
              {whatsappUrl(o.buyer_phone, '') && (
                <a className="btn btn-sm" target="_blank" rel="noreferrer"
                   href={whatsappUrl(o.buyer_phone, `Hi ${o.buyer_name.split(' ')[0]}, here is your ticket for ${ev.title}: ${orderLink(o.access_token)}`)}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      )}
      </div>
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
    <details className="card p-5">
      <summary className="text-sm font-bold">
        Issue free tickets <span className="font-normal text-ink3">(performers, guests, sponsors)</span>
      </summary>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={f.name} onChange={set('name')} required /></div>
          <div><label className="label">Number of tickets</label><input type="number" min="1" max="20" className="input" value={f.qty} onChange={set('qty')} required /></div>
          <div><label className="label">Email (optional)</label><input type="email" className="input" value={f.email} onChange={set('email')} /></div>
          <div><label className="label">Phone (optional)</label><input type="tel" className="input" value={f.phone} onChange={set('phone')} /></div>
        </div>
        {error && <p className="note note-red">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Issuing…' : 'Issue tickets'}</button>
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
        to_email: d.buyer_email, to_name: d.buyer_name, subject: content.subject,
        message: content.message, order_link: link, event_title: d.event_title,
      })
      setNotice({ type: 'ok', text: `${okText} Email sent to ${d.buyer_email}.`, link, wa })
    } catch (err) {
      const why = err?.text || err?.message || 'unknown error'
      setNotice({ type: 'warn', text: `${okText} But the email could not be sent (${why}). Send the customer their link yourself:`, link, wa })
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
      content: confirmationContent({ name: data.buyer_name, eventTitle: data.event_title, reference: data.reference, quantity: data.quantity }),
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
      content: rejectionContent({ name: data.buyer_name, eventTitle: ev.title, reference: data.reference, reason: data.reject_reason }),
      d: { ...data, event_title: ev.title }, phone: o.buyer_phone, okText: `${o.reference} rejected.`,
    })
    setBusyId(null)
    load()
  }

  async function resend(o) {
    setBusyId(o.id)
    setNotice(null)
    await emailCustomer({
      content: confirmationContent({ name: o.buyer_name, eventTitle: ev.title, reference: o.reference, quantity: o.quantity }),
      d: { ...o, event_title: ev.title }, phone: o.buyer_phone, okText: 'Done.',
    })
    setBusyId(null)
  }

  async function afterComplimentary(data, phone) {
    if (data.buyer_email) {
      await emailCustomer({
        content: confirmationContent({ name: data.buyer_name, eventTitle: data.event_title, reference: data.reference, quantity: data.quantity }),
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
        [o.reference, o.buyer_name, o.payer_name, o.buyer_phone, o.buyer_email].some((v) => (v || '').toLowerCase().includes(q))
      )
    }
    return orders.filter(TABS.find((t) => t.key === tab).match)
  }, [orders, tab, search])

  if (loadError) return <p className="note note-red">{loadError}</p>
  if (!ev || !orders) return <p className="text-sm text-ink3">Loading…</p>

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to={`/host/events/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 no-underline hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> {ev.title}
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl lg:text-4xl">Payments</h1>
        <button className="btn btn-sm" onClick={load}>Refresh</button>
      </div>

      {!emailConfigured && (
        <p className="note note-amber">
          Email isn't set up yet, so confirmations won't be emailed. You can still copy each customer's ticket link or send it on WhatsApp.
        </p>
      )}

      {notice && (
        <div className={`note ${notice.type === 'error' ? 'note-red' : notice.type === 'ok' ? 'note-green' : 'note-amber'} flex-col`}>
          <div className="flex w-full items-start justify-between gap-3">
            <span>{notice.text}</span>
            <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
          {notice.link && (
            <div className="flex flex-wrap gap-2">
              <CopyButton text={notice.link} label="Copy ticket link" />
              {notice.wa && (
                <a className="btn btn-sm" href={notice.wa} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <ComplimentaryForm eventId={id} onIssued={afterComplimentary} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
        <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)}
               placeholder="Search by reference, name, phone or email…" />
      </div>

      {!search && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span className="opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink3">{search ? 'No orders match your search.' : 'Nothing here yet.'}</div>
      )}

      {visible.map((o) => (
        <OrderCard key={o.id} o={o} ev={ev} proofUrl={proofUrls[o.proof_path]} busy={busyId === o.id}
                   onApprove={approve} onReject={reject} onResend={resend} />
      ))}
    </div>
  )
}
