import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { formatDateTime, money } from './lib/format'
import EventSummary from './components/EventSummary.jsx'
import CopyButton from './components/CopyButton.jsx'
import TicketCard from './components/TicketCard.jsx'

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}
const MAX_BYTES = 5 * 1024 * 1024

function ProofForm({ token, order, onDone, replacing }) {
  const [file, setFile] = useState(null)
  const [payer, setPayer] = useState(order.payer_name || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!payer.trim()) return setError('Please enter the name on the bank account you paid from.')
    if (!file) return setError('Please choose your proof of payment.')
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) return setError('Please upload a screenshot or photo (JPG, PNG or WebP) or a PDF.')
    if (file.size > MAX_BYTES) return setError('That file is bigger than 5 MB. Please upload a smaller one, or a screenshot.')

    setBusy(true)
    const path = `${order.id}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type })
    if (up.error) {
      setBusy(false)
      return setError(`Upload failed: ${up.error.message}`)
    }
    const { error } = await supabase.rpc('submit_proof', {
      p_token: token,
      p_proof_path: path,
      p_payer_name: payer,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setFile(null)
    onDone()
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        Name on the bank account you paid from
        <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="As it appears on your bank statement" />
        <span className="muted small">This helps the host match your payment.</span>
      </label>
      <label>
        {replacing ? 'Upload a different proof of payment' : 'Proof of payment'}
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
               onChange={(e) => setFile(e.target.files[0] || null)} />
        <span className="muted small">A screenshot of the successful transfer or your bank's receipt (max 5 MB).</span>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Uploading…' : replacing ? 'Replace proof' : 'Submit proof of payment'}
      </button>
    </form>
  )
}

export default function OrderPage() {
  const { token } = useParams()
  const [data, setData] = useState(undefined) // undefined = loading, null = not found
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token })
    if (error) {
      setError('This order link does not look right. Please check you copied the whole link.')
    } else {
      setData(data)
    }
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

  if (error) return <div className="page narrow"><p className="error">{error}</p></div>
  if (data === undefined) return <div className="page narrow"><p className="muted">Loading…</p></div>
  if (data === null) {
    return (
      <div className="page narrow">
        <div className="card center">
          <h1>Order not found</h1>
          <p className="muted">We couldn't find that order.</p>
          <Link to="/find" className="btn">Find my order</Link>
        </div>
      </div>
    )
  }

  const { order, event, tickets } = data
  const cur = event.currency
  const pageLink = window.location.href

  return (
    <div className="page narrow">
      <div className="stack">
        <div className="card no-print">
          <EventSummary event={event} />
        </div>

        {status === 'pending_payment' && (
          <>
            <div className="card stack">
              <h2>1. Make your payment</h2>
              <p>
                Your {order.quantity === 1 ? 'ticket is' : `${order.quantity} tickets are`} reserved until{' '}
                <strong>{formatDateTime(order.expires_at)}</strong>. Pay before then, or they'll be released.
              </p>
              <div className="total-row">
                <span>Amount to pay</span>
                <strong>{money(order.total_amount, cur)}</strong>
              </div>
              {event.bank_details && <div className="bank-box pre">{event.bank_details}</div>}
              <div className="ref-box">
                <div className="muted small">Use this as your payment reference</div>
                <div className="ref-code">{order.reference}</div>
                <CopyButton text={order.reference} label="Copy reference" />
              </div>
            </div>
            <div className="card stack">
              <h2>2. Upload proof of payment</h2>
              <ProofForm token={token} order={order} onDone={load} />
            </div>
          </>
        )}

        {status === 'proof_uploaded' && (
          <div className="card stack">
            <h2>Payment proof received ✓</h2>
            <p>
              Thank you{order.buyer_name ? `, ${order.buyer_name.split(' ')[0]}` : ''}. The host will check
              your payment and confirm your {order.quantity === 1 ? 'ticket' : 'tickets'}. This page updates
              by itself, and you'll also get an email once it's confirmed.
            </p>
            <div className="ref-box">
              <div className="muted small">Your reference</div>
              <div className="ref-code">{order.reference}</div>
            </div>
            <details>
              <summary>Uploaded the wrong file?</summary>
              <div className="stack" style={{ marginTop: 12 }}>
                <ProofForm token={token} order={order} onDone={load} replacing />
              </div>
            </details>
          </div>
        )}

        {status === 'confirmed' && (
          <>
            <div className="card stack no-print">
              <h2>Payment confirmed 🎉</h2>
              <p>
                Your {order.quantity === 1 ? 'ticket is' : 'tickets are'} below. Show the QR code at the door.
                Save {order.quantity === 1 ? 'it' : 'them'} as {order.quantity === 1 ? 'an image' : 'images'} so
                you can open {order.quantity === 1 ? 'it' : 'them'} without signal, or just keep this page link.
              </p>
              <div>
                <button className="btn" onClick={() => window.print()}>Print tickets</button>
              </div>
            </div>
            {tickets.map((t, i) => (
              <TicketCard key={t.id} ticket={t} event={event} index={i + 1} total={tickets.length} />
            ))}
          </>
        )}

        {status === 'rejected' && (
          <div className="card stack">
            <h2>We couldn't confirm your payment</h2>
            {order.reject_reason && <p className="error">{order.reject_reason}</p>}
            <p className="muted">
              Please contact the host with your reference <strong>{order.reference}</strong>, or place a new order
              from the event link.
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="card stack">
            <h2>This reservation has expired</h2>
            <p className="muted">
              We didn't receive a payment in time, so the tickets were released. If you've already paid,
              contact the host with your reference <strong>{order.reference}</strong>. Otherwise, place a new
              order from the event link.
            </p>
          </div>
        )}

        <div className="card stack-sm no-print">
          <div className="row between wrap">
            <strong>Order {order.reference}</strong>
            <CopyButton text={pageLink} label="Copy link to this page" />
          </div>
          <p className="muted small">
            Keep this link, as it's the way back to your order. If you lose it, use{' '}
            <Link to="/find">Find my order</Link> with your reference and phone number.
          </p>
        </div>
      </div>
    </div>
  )
}
