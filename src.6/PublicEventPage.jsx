import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CircleAlert, Clock, Info, Lock } from 'lucide-react'
import { supabase } from './supabaseClient'
import { formatDateTime, money } from './lib/format'
import { getOrderToken, saveOrder } from './lib/myOrders'
import CustomerShell from './components/CustomerShell.jsx'
import EventFacts from './components/EventFacts.jsx'
import { Cover, DatePlaque } from './components/ui.jsx'

export default function PublicEventPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true })
  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const existingToken = getOrderToken(slug)

  async function load() {
    const { data, error } = await supabase.rpc('get_public_event', { p_slug: slug })
    if (error) setState({ error: error.message })
    else setState({ event: data })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (state.loading) return <CustomerShell><p className="text-sm text-ink3">Loading…</p></CustomerShell>
  if (state.error) return <CustomerShell><p className="note note-red">{state.error}</p></CustomerShell>
  if (!state.event) {
    return (
      <CustomerShell>
        <div className="card space-y-3 p-8 text-center">
          <h1 className="display text-2xl">Event not found</h1>
          <p className="text-sm text-ink2">This event doesn't exist or isn't on sale right now.</p>
          <Link to="/find" className="text-sm font-semibold">Already bought tickets? Find my order</Link>
        </div>
      </CustomerShell>
    )
  }

  const e = state.event
  const deadlinePassed = new Date() > new Date(e.sales_deadline)
  const soldOut = e.remaining <= 0
  const open = !deadlinePassed && !soldOut
  const maxQty = Math.max(1, Math.min(10, e.remaining))
  const safeQty = Math.min(qty, maxQty)
  const set = (key) => (ev) => setForm((p) => ({ ...p, [key]: ev.target.value }))
  const low = e.remaining <= Math.max(5, Math.round(e.capacity * 0.15))

  async function submit(ev) {
    ev.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!form.email.trim()) return setError('Please enter your email.')
    if (!form.phone.trim()) return setError('Please enter your phone number.')

    setBusy(true)
    const { data, error } = await supabase.rpc('create_order', {
      p_event_id: e.id,
      p_name: form.name,
      p_email: form.email,
      p_phone: form.phone,
      p_quantity: safeQty,
    })
    setBusy(false)

    if (error) {
      setError(error.message)
      load()
      return
    }
    saveOrder(slug, data.access_token)
    navigate(`/order/${data.access_token}`)
  }

  return (
    <CustomerShell brand={e.title}>
      <div className="space-y-4">
        {existingToken && (
          <div className="note note-amber items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span>You already started an order on this device.</span>
            </div>
            <Link to={`/order/${existingToken}`} className="whitespace-nowrap font-semibold text-amber-950 underline underline-offset-2">
              View my order →
            </Link>
          </div>
        )}

        <article className="card overflow-hidden">
          <Cover path={e.cover_path} fallback={false} className="aspect-video w-full" alt="" />
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <span className={`pill ${open ? 'pill-green' : 'pill-gray'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-ink3'}`} />
                  {open ? 'Tickets on sale' : soldOut ? 'Sold out' : 'Sales closed'}
                </span>
                <h1 className="display text-3xl leading-tight">{e.title}</h1>
              </div>
              <DatePlaque iso={e.starts_at} />
            </div>

            <EventFacts event={e} className="mt-5 border-t border-line pt-4" />

            {e.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink2">{e.description}</p>
            )}

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
              <div>
                <div className="kicker">Ticket</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">{money(e.ticket_price, e.currency)}</span>
                  <span className="text-xs text-ink3">/ ticket</span>
                </div>
              </div>
              <div className="text-right">
                {!soldOut && (
                  <span className={`pill ${low ? 'pill-amber' : 'pill-gray'}`}>
                    {e.remaining} {e.remaining === 1 ? 'ticket' : 'tickets'} left
                  </span>
                )}
                <p className="mt-1 text-[10px] text-ink3">{e.capacity} tickets in total</p>
              </div>
            </div>
          </div>
        </article>

        {deadlinePassed ? (
          <div className="card space-y-2 p-8 text-center">
            <Lock className="mx-auto h-6 w-6 text-ink3" />
            <h2 className="text-lg font-bold">Ticket sales have closed</h2>
            <p className="text-sm text-ink2">Sales ended {formatDateTime(e.sales_deadline)}.</p>
          </div>
        ) : soldOut ? (
          <div className="card space-y-2 p-8 text-center">
            <CircleAlert className="mx-auto h-6 w-6 text-ink3" />
            <h2 className="text-lg font-bold">Sorry, this event is sold out</h2>
            <p className="text-sm text-ink2">
              Reserved tickets that aren't paid for are released after a while, so it's worth checking back.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-5 p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Step 1 of 2</span>
                <h2 className="text-lg font-bold tracking-tight">Get your tickets</h2>
              </div>
              <span className="text-xs font-medium text-ink3">Pay by bank transfer</span>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold" htmlFor="qty">How many tickets?</label>
                <span className="text-[11px] text-ink3">{safeQty} × {money(e.ticket_price, e.currency)}</span>
              </div>
              <select id="qty" className="input cursor-pointer" value={safeQty} onChange={(x) => setQty(Number(x.target.value))}>
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'ticket' : 'tickets'} — {money(e.ticket_price * n, e.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="name">Your full name <span className="text-red-600">*</span></label>
              <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
            </div>
            <div>
              <label className="label" htmlFor="email">Email address <span className="text-red-600">*</span></label>
              <input id="email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required />
              <p className="hint flex items-center gap-1"><Info className="h-3 w-3" /> Your confirmation and tickets will be sent here.</p>
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone number <span className="text-red-600">*</span></label>
              <input id="phone" type="tel" className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
              <p className="hint flex items-center gap-1"><Info className="h-3 w-3" /> Used to find your order if you lose your link.</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-sand px-4 py-3.5">
              <span className="kicker">Order total</span>
              <span className="text-xl font-bold tracking-tight">{money(e.ticket_price * safeQty, e.currency)}</span>
            </div>

            {error && <p className="note note-red">{error}</p>}

            <button className="btn btn-primary btn-lg group w-full" disabled={busy}>
              {busy ? 'Reserving…' : 'Continue to payment'}
              {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>

            <div className="space-y-1 text-center">
              <p className="inline-flex items-center gap-1.5 text-xs text-ink2">
                <Clock className="h-3.5 w-3.5 text-amber-600" /> Your tickets are reserved while you pay.
              </p>
              <p className="text-[11px] text-ink3">Sales close {formatDateTime(e.sales_deadline)}.</p>
            </div>
          </form>
        )}

        <p className="text-center">
          <Link to="/find" className="text-xs font-semibold text-ink2 underline-offset-4 hover:underline">
            Already ordered? Find my order
          </Link>
        </p>
      </div>
    </CustomerShell>
  )
}
