import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { formatDateTime, money } from './lib/format'
import { getOrderToken, saveOrder } from './lib/myOrders'
import EventSummary from './components/EventSummary.jsx'

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

  if (state.loading) return <div className="page narrow"><p className="muted">Loading…</p></div>
  if (state.error) return <div className="page narrow"><p className="error">{state.error}</p></div>
  if (!state.event) {
    return (
      <div className="page narrow">
        <div className="card center">
          <h1>Event not found</h1>
          <p className="muted">This event doesn't exist or isn't on sale right now.</p>
          <Link to="/find" className="small-link">Already bought tickets? Find my order</Link>
        </div>
      </div>
    )
  }

  const e = state.event
  const deadlinePassed = new Date() > new Date(e.sales_deadline)
  const soldOut = e.remaining <= 0
  const maxQty = Math.max(1, Math.min(10, e.remaining))
  const safeQty = Math.min(qty, maxQty)
  const set = (key) => (ev) => setForm((p) => ({ ...p, [key]: ev.target.value }))

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
      load() // availability may have changed
      return
    }
    saveOrder(slug, data.access_token)
    navigate(`/order/${data.access_token}`)
  }

  return (
    <div className="page narrow">
      <div className="stack">
        <div className="card stack">
          <EventSummary event={e} />
          {e.description && <p className="pre">{e.description}</p>}
          <div className="price-row">
            <div>
              <div className="big">{money(e.ticket_price, e.currency)}</div>
              <div className="muted small">per ticket</div>
            </div>
            <div className="right">
              <div className="big">{soldOut ? 'Sold out' : e.remaining}</div>
              <div className="muted small">{soldOut ? '' : e.remaining === 1 ? 'ticket left' : 'tickets left'}</div>
            </div>
          </div>
        </div>

        {existingToken && (
          <div className="notice">
            You already started an order on this device.{' '}
            <Link to={`/order/${existingToken}`}>View my order</Link>
          </div>
        )}

        {deadlinePassed ? (
          <div className="card center"><h2>Ticket sales have closed</h2></div>
        ) : soldOut ? (
          <div className="card center">
            <h2>Sorry, this event is sold out</h2>
            <p className="muted small">Reserved tickets that aren't paid for are released after a while, so check back later.</p>
          </div>
        ) : (
          <form className="card stack" onSubmit={submit}>
            <h2>Get your tickets</h2>
            <label>
              How many tickets?
              <select value={safeQty} onChange={(x) => setQty(Number(x.target.value))}>
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Your full name
              <input value={form.name} onChange={set('name')} autoComplete="name" required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              <span className="muted small">Your confirmation and ticket will be sent here.</span>
            </label>
            <label>
              Phone number
              <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
              <span className="muted small">Used to find your order if you lose your link.</span>
            </label>

            <div className="total-row">
              <span>Total</span>
              <strong>{money(e.ticket_price * safeQty, e.currency)}</strong>
            </div>

            {error && <p className="error">{error}</p>}
            <button className="btn primary big-btn" disabled={busy}>
              {busy ? 'Reserving…' : 'Continue to payment'}
            </button>
            <p className="muted small center-text">
              Your tickets are reserved while you pay. Sales close {formatDateTime(e.sales_deadline)}.
            </p>
          </form>
        )}

        <p className="center-text">
          <Link to="/find" className="small-link">Already ordered? Find my order</Link>
        </p>
      </div>
    </div>
  )
}
