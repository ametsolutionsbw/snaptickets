import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, Clock, FileText, Printer } from 'lucide-react'
import { supabase } from './supabaseClient'
import { formatDateTime, money } from './lib/format'
import CustomerShell from './components/CustomerShell.jsx'
import EventFacts from './components/EventFacts.jsx'
import CopyButton from './components/CopyButton.jsx'
import ProofForm from './components/ProofForm.jsx'
import TicketCard from './components/TicketCard.jsx'
import HostContact from './components/HostContact.jsx'
import { Cover, Notice, StepNumber } from './components/ui.jsx'

const HEADER_STATUS = {
  pending_payment: ['Payment required', 'pill-amber'],
  proof_uploaded: ['Awaiting confirmation', 'pill-blue'],
  confirmed: ['Confirmed', 'pill-green'],
  rejected: ['Action required', 'pill-red'],
  expired: ['Reservation expired', 'pill-gray'],
}

export default function OrderPage() {
  const { token } = useParams()
  const [data, setData] = useState(undefined) // undefined = loading, null = not found
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token })
    if (error) setError('This order link does not look right. Please check you copied the whole link.')
    else setData(data)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // While waiting on the host, check for updates every 30 seconds.
  const status = data?.order?.status
  useEffect(() => {
    if (status !== 'pending_payment' && status !== 'proof_uploaded') return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [status, load])

  if (error) return <CustomerShell><p className="note note-red">{error}</p></CustomerShell>
  if (data === undefined) return <CustomerShell><p className="text-sm text-ink3">Loading…</p></CustomerShell>
  if (data === null) {
    return (
      <CustomerShell>
        <div className="card space-y-3 p-8 text-center">
          <h1 className="display text-2xl">Order not found</h1>
          <p className="text-sm text-ink2">We couldn't find that order.</p>
          <div><Link to="/find" className="btn">Find my order</Link></div>
        </div>
      </CustomerShell>
    )
  }

  const { order, event, tickets } = data
  const cur = event.currency
  const many = order.quantity > 1
  const [pillText, pillCls] = HEADER_STATUS[status] || ['', 'pill-gray']

  return (
    <CustomerShell>
      <div className="grid gap-6 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10">
        {/* Event header */}
        <section className="card no-print overflow-hidden lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Cover path={event.cover_path} fallback={false} className="h-32 w-full sm:h-44" alt="" />
          <div className="space-y-3 p-6">
            <span className={`pill ${pillCls}`}>{pillText}</span>
            <h1 className="display text-3xl leading-tight">{event.title}</h1>
            <EventFacts event={event} />
          </div>
        </section>

        {/* The part that changes with the order status */}
        <div className="min-w-0 space-y-5 lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">

        {/* PAYMENT REQUIRED */}
        {status === 'pending_payment' && (
          <>
            <section className="card space-y-5 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <StepNumber n="1" /> Make your payment
              </h2>
              <Notice tone="amber" icon={Clock}>
                Your {many ? `${order.quantity} tickets are` : 'ticket is'} reserved until{' '}
                <strong>{formatDateTime(order.expires_at)}</strong>. Pay before then, or {many ? 'they' : 'it'}'ll be released.
              </Notice>
              <div className="flex items-center justify-between rounded-xl border border-line bg-sand px-4 py-3.5">
                <span className="text-sm font-medium text-ink2">Amount to pay</span>
                <span className="text-2xl font-extrabold tracking-tight">{money(order.total_amount, cur)}</span>
              </div>
              {event.bank_details && (
                <div className="rounded-xl border border-line bg-[#fcfaf7] p-4">
                  <p className="kicker mb-2">Bank transfer details</p>
                  <p className="whitespace-pre-line text-sm font-medium leading-relaxed">{event.bank_details}</p>
                </div>
              )}
              <div className="space-y-2 rounded-xl border border-dashed border-brand-500/50 bg-brand-50/50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Use this as your payment reference</p>
                <p className="select-all font-mono text-2xl font-bold tracking-widest">{order.reference}</p>
                <CopyButton text={order.reference} label="Copy reference" />
              </div>
            </section>

            <section className="card space-y-5 p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <StepNumber n="2" /> Upload proof of payment
                </h2>
                <p className="ml-8 mt-1 text-xs text-ink3">Confirm your transfer with your name and a receipt.</p>
              </div>
              <ProofForm token={token} order={order} onDone={load} />
            </section>
          </>
        )}

        {/* PROOF RECEIVED */}
        {status === 'proof_uploaded' && (
          <section className="card space-y-5 p-6">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                <CircleCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Payment proof received</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink2">
                  Thank you, {order.buyer_name.split(' ')[0]}. The host will check your payment and confirm your{' '}
                  {many ? 'tickets' : 'ticket'}. This page updates by itself, and you'll get an email once it's confirmed.
                </p>
              </div>
            </div>
            <div className="space-y-1 rounded-xl border border-dashed border-brand-500/50 bg-brand-50/50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Your reference</p>
              <p className="font-mono text-2xl font-bold tracking-widest">{order.reference}</p>
              <p className="text-xs text-ink2">{order.quantity} × {many ? 'tickets' : 'ticket'} · {money(order.total_amount, cur)}</p>
            </div>
            <details className="group">
              <summary className="text-sm font-semibold text-ink2 hover:text-ink">Uploaded the wrong file?</summary>
              <div className="mt-4">
                <ProofForm token={token} order={order} onDone={load} submitLabel="Replace proof" />
              </div>
            </details>
          </section>
        )}

        {/* CONFIRMED */}
        {status === 'confirmed' && (
          <>
            <section className="card no-print space-y-3 p-6">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CircleCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Payment confirmed</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink2">
                    Your {many ? 'tickets are' : 'ticket is'} below. Show the QR code at the door. Save{' '}
                    {many ? 'them as images' : 'it as an image'} so you can open {many ? 'them' : 'it'} without signal, or keep this page link.
                  </p>
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print {many ? 'tickets' : 'ticket'}
              </button>
            </section>
            {tickets.map((t, i) => (
              <TicketCard key={t.id} ticket={t} event={event} index={i + 1} total={tickets.length} />
            ))}
          </>
        )}

        {/* REJECTED */}
        {status === 'rejected' && (
          <section className="card space-y-6 p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
                <CircleAlert className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">We couldn't confirm your payment</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink2">
                  The host reviewed your submission but couldn't validate the transaction.
                </p>
              </div>
            </div>
            {order.reject_reason && (
              <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-[#faf7f5] p-4">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-800">Reason from host</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed">{order.reject_reason}</p>
                </div>
              </div>
            )}
            <p className="text-sm leading-relaxed text-ink2">
              If you've paid, upload a clear copy of your bank receipt below, quoting reference{' '}
              <span className="rounded border border-line bg-sand px-1.5 py-0.5 font-mono text-[13px] font-bold text-ink">{order.reference}</span>.
            </p>
            <ProofForm token={token} order={order} onDone={load} submitLabel="Re-submit proof of payment" />
          </section>
        )}

        {/* EXPIRED */}
        {status === 'expired' && (
          <section className="card space-y-3 p-6">
            <h2 className="text-xl font-bold tracking-tight">This reservation has expired</h2>
            <p className="text-sm leading-relaxed text-ink2">
              We didn't receive a payment in time, so the tickets were released. If you've already paid, contact the
              host with your reference{' '}
              <span className="rounded border border-line bg-sand px-1.5 py-0.5 font-mono text-[13px] font-bold text-ink">{order.reference}</span>.
              Otherwise, place a new order from the event link.
            </p>
          </section>
        )}

        </div>

        {/* Order reference + help */}
        <section className="card no-print space-y-4 p-5 lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="kicker">Order reference</span>
                <span className="font-mono text-sm font-bold">{order.reference}</span>
              </div>
              <p className="text-xs leading-relaxed text-ink2">
                Keep this link, as it's the way back to your order. If you lose it, use{' '}
                <Link to="/find" className="font-medium text-ink underline underline-offset-2">Find my order</Link>{' '}
                with your reference and phone number.
              </p>
            </div>
            <CopyButton text={window.location.href} label="Copy link to this page" className="shrink-0" />
          </div>
          <HostContact event={event} reference={order.reference} />
        </section>
      </div>
    </CustomerShell>
  )
}
