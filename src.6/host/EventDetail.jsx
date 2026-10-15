import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { ArrowLeft, ArrowRight, Bell, Download, ExternalLink, Link2, QrCode, Share2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDateTime, money, publicEventUrl } from '../lib/format'
import CopyButton from '../components/CopyButton.jsx'
import EventFacts from '../components/EventFacts.jsx'
import { Cover, StatusPill } from '../components/ui.jsx'

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === 'amber' ? 'border-amber-200 bg-amber-50/70' : 'border-line bg-sand'}`}>
      <div className="text-[11px] font-semibold text-ink3">{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${tone === 'amber' ? 'text-amber-800' : ''}`}>{value}</div>
    </div>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [stats, setStats] = useState(null)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
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

  if (error && !ev) return <p className="note note-red">{error}</p>
  if (!ev) return <p className="text-sm text-ink3">Loading…</p>

  const cur = ev.currency
  const sold = stats ? ev.capacity - stats.remaining : 0
  const soldPct = Math.min(100, Math.round((sold / ev.capacity) * 100))
  const review = stats?.orders_awaiting_review || 0

  return (
    <div className="space-y-6">
      <Link to="/host" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 no-underline hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All events
      </Link>

      {/* Hero */}
      <section className="card overflow-hidden">
        <Cover path={ev.cover_path} className="aspect-[3/1] w-full" />
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <StatusPill status={ev.status} />
            <h1 className="display text-3xl leading-tight">{ev.title}</h1>
            <EventFacts event={ev} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ev.status === 'published' && (
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-dark">
                Preview public page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Link to={`/host/events/${id}/edit`} className="btn">Edit details</Link>
            {ev.status !== 'published' ? (
              <button className="btn btn-primary" disabled={busy} onClick={() => setStatus('published')}>
                Publish (start selling)
              </button>
            ) : (
              <button className="btn" disabled={busy} onClick={() => setStatus('closed')}>Close sales</button>
            )}
          </div>
        </div>
      </section>

      {error && <p className="note note-red">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {review > 0 && (
            <div className="note note-amber items-center justify-between !p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold">{review} {review === 1 ? 'payment is' : 'payments are'} waiting for review</p>
                  <p className="text-xs text-amber-900/80">Approve them to send out tickets.</p>
                </div>
              </div>
              <Link to={`/host/events/${id}/orders`} className="btn btn-sm shrink-0 border-amber-600 bg-amber-600 text-white hover:bg-amber-700">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <section className="card space-y-5 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight">Overview</h2>
              <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold">{stats ? stats.remaining : '…'} tickets left</span>
                <span className="text-ink3">{sold} of {ev.capacity} sold or reserved</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-sand2">
                <div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${soldPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Tickets confirmed" value={stats ? stats.tickets_confirmed : '…'} />
              <Stat label="Payments to review" value={stats ? review : '…'} tone={review > 0 ? 'amber' : undefined} />
              <Stat label="Checked in" value={stats ? stats.checked_in : '…'} />
              <Stat label="Money confirmed" value={stats ? money(stats.amount_confirmed, cur) : '…'} />
              <Stat label="Money pending" value={stats ? money(stats.amount_pending, cur) : '…'} />
            </div>

            <p className="text-xs text-ink3">
              {money(ev.ticket_price, cur)} per ticket · {ev.capacity} tickets in total · sales close {formatDateTime(ev.sales_deadline)}
            </p>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="text-base font-bold tracking-tight">Manage</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link to={`/host/events/${id}/orders`} className="btn justify-between">Payments <ArrowRight className="h-4 w-4 text-ink3" /></Link>
              <Link to={`/host/events/${id}/guests`} className="btn justify-between">Guest list <ArrowRight className="h-4 w-4 text-ink3" /></Link>
              <Link to={`/host/events/${id}/scan`} className="btn btn-primary justify-between">
                <span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Scan tickets</span>
              </Link>
            </div>
            <p className="text-xs text-ink3">
              Open the scanner on your phone at the door. Download the guest list (CSV) beforehand as a backup.
            </p>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-6">
            <div>
              <h2 className="text-base font-bold tracking-tight">Share with customers</h2>
              <p className="mt-0.5 text-xs text-ink3">Put the link or QR code on posters, flyers and social media.</p>
            </div>
            {ev.status !== 'published' && (
              <p className="note note-amber">
                This event is <strong>{ev.status}</strong>, so the link won't show it to customers yet. Publish it first.
              </p>
            )}
            <div>
              <label className="label" htmlFor="eventurl">Event link</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
                  <input id="eventurl" readOnly value={url} onFocus={(e) => e.target.select()}
                         className="input pl-9 font-mono text-xs" />
                </div>
                <CopyButton text={url} label="Copy" className="!px-3" />
              </div>
            </div>
            {qr && (
              <div className="flex items-center gap-4 rounded-xl border border-line bg-sand p-4">
                <img src={qr} alt="QR code for the event page" className="h-28 w-28 shrink-0 rounded-lg bg-white p-1.5" />
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed text-ink2">Scanning this opens your event page.</p>
                  <a className="btn btn-sm" href={qr} download={`${ev.slug}-qr.png`}>
                    <Download className="h-3.5 w-3.5" /> Download QR
                  </a>
                </div>
              </div>
            )}
            <a className="btn w-full" target="_blank" rel="noreferrer"
               href={`https://wa.me/?text=${encodeURIComponent(`${ev.title}\nGet your tickets: ${url}`)}`}>
              <Share2 className="h-4 w-4" /> Share on WhatsApp
            </a>
          </section>

          <section className="card p-6">
            <h2 className="mb-2 text-base font-bold tracking-tight">Quick reference</h2>
            <dl className="divide-y divide-line text-sm">
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink3">Ticket price</dt><dd className="font-semibold">{money(ev.ticket_price, cur)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink3">Capacity</dt><dd className="font-semibold">{ev.capacity} tickets</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink3">Payment reference</dt><dd className="font-mono text-xs font-semibold">{ev.ref_prefix}-XXXXX</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink3">Hold unpaid</dt><dd className="font-semibold">{ev.hold_hours} hours</dd></div>
              {(ev.contact_email || ev.contact_phone) && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink3">Contact</dt>
                  <dd className="truncate text-right text-xs font-semibold">{ev.contact_email || ev.contact_phone}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
