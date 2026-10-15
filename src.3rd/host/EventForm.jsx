import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { DEFAULT_CURRENCY } from '../config'
import { toLocalInput } from '../lib/format'
import MapPicker from '../components/MapPicker.jsx'

const EMPTY = {
  title: '',
  description: '',
  slug: '',
  starts_at: '',
  sales_deadline: '',
  ticket_price: '',
  currency: DEFAULT_CURRENCY,
  capacity: '',
  venue_name: '',
  venue_address: '',
  venue_lat: null,
  venue_lng: null,
  bank_details: '',
  ref_prefix: 'TIX',
  hold_hours: 24,
  status: 'draft',
}

// Loads the event first (when editing) so the form and map start with the right values.
export default function EventForm() {
  const { id } = useParams()
  const [initial, setInitial] = useState(id ? null : EMPTY)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setLoadError(error.message)
        setInitial({
          ...EMPTY,
          ...data,
          description: data.description ?? '',
          venue_name: data.venue_name ?? '',
          venue_address: data.venue_address ?? '',
          bank_details: data.bank_details ?? '',
          starts_at: toLocalInput(data.starts_at),
          sales_deadline: toLocalInput(data.sales_deadline),
          ticket_price: String(data.ticket_price),
          capacity: String(data.capacity),
        })
      })
  }, [id])

  if (loadError) return <p className="error">{loadError}</p>
  if (!initial) return <p className="muted">Loading…</p>
  return <EventFormInner id={id} initial={initial} />
}

function EventFormInner({ id, initial }) {
  const navigate = useNavigate()
  const [f, setF] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const editing = Boolean(id)

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')

    const starts = new Date(f.starts_at)
    const deadline = new Date(f.sales_deadline)
    const price = Number(f.ticket_price)
    const capacity = parseInt(f.capacity, 10)
    const prefix = f.ref_prefix.trim().toUpperCase()
    const slug = f.slug.trim().toLowerCase()
    const hold = parseInt(f.hold_hours, 10)

    if (!f.title.trim()) return setError('Please give the event a title.')
    if (isNaN(starts) || isNaN(deadline)) return setError('Please set the event date and the sales deadline.')
    if (deadline > starts) return setError('The sales deadline must be on or before the event start.')
    if (!(price >= 0)) return setError('Ticket price must be 0 or more.')
    if (!(capacity > 0)) return setError('Number of tickets must be at least 1.')
    if (!/^[A-Z0-9]{2,6}$/.test(prefix)) return setError('Payment reference prefix must be 2–6 letters or numbers, e.g. POEM.')
    if (slug && !/^[a-z0-9-]{3,40}$/.test(slug)) return setError('Link name can only use lowercase letters, numbers and dashes (3–40 characters).')
    if (!(hold >= 1 && hold <= 168)) return setError('Payment hold must be between 1 and 168 hours.')
    if (f.status === 'published' && !f.bank_details.trim()) {
      return setError('Add your bank details before publishing, so customers know where to pay.')
    }

    setBusy(true)

    // Don't allow shrinking capacity below tickets already sold or held.
    if (editing) {
      const { data: stats } = await supabase.rpc('host_event_stats', { p_event_id: id })
      if (stats) {
        const taken = Number(initial.capacity) - stats.remaining
        if (capacity < taken) {
          setBusy(false)
          return setError(`${taken} tickets are already sold or reserved, so capacity can't go below ${taken}.`)
        }
      }
    }

    const payload = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      starts_at: starts.toISOString(),
      sales_deadline: deadline.toISOString(),
      ticket_price: price,
      currency: f.currency.trim().toUpperCase() || DEFAULT_CURRENCY,
      capacity,
      venue_name: f.venue_name.trim() || null,
      venue_address: f.venue_address.trim() || null,
      venue_lat: f.venue_lat,
      venue_lng: f.venue_lng,
      bank_details: f.bank_details.trim() || null,
      ref_prefix: prefix,
      hold_hours: hold,
      status: f.status,
    }
    if (slug) payload.slug = slug

    let result
    if (editing) {
      result = await supabase.from('events').update(payload).eq('id', id).select('id').single()
    } else {
      result = await supabase.from('events').insert(payload).select('id').single()
    }

    setBusy(false)
    if (result.error) {
      if (result.error.code === '23505') return setError('That link name is already taken. Try another.')
      return setError(result.error.message)
    }
    navigate(`/host/events/${result.data.id}`)
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="row between">
        <h1>{editing ? 'Edit event' : 'New event'}</h1>
        <Link to={editing ? `/host/events/${id}` : '/host'} className="btn ghost">Cancel</Link>
      </div>

      <section className="card stack">
        <h2>Basics</h2>
        <label>
          Event title
          <input value={f.title} onChange={set('title')} placeholder="An Evening of Spoken Word" required />
        </label>
        <label>
          Description
          <textarea rows={4} value={f.description} onChange={set('description')}
                    placeholder="Tell people what to expect: line-up, dress code, doors open…" />
        </label>
        <div className="grid2">
          <label>
            Event starts
            <input type="datetime-local" value={f.starts_at} onChange={set('starts_at')} required />
          </label>
          <label>
            Ticket sales close
            <input type="datetime-local" value={f.sales_deadline} onChange={set('sales_deadline')} required />
          </label>
        </div>
      </section>

      <section className="card stack">
        <h2>Tickets &amp; price</h2>
        <div className="grid3">
          <label>
            Price per ticket
            <input type="number" min="0" step="0.01" value={f.ticket_price} onChange={set('ticket_price')} required />
          </label>
          <label>
            Currency
            <input value={f.currency} onChange={set('currency')} maxLength={3} />
          </label>
          <label>
            Number of tickets
            <input type="number" min="1" step="1" value={f.capacity} onChange={set('capacity')} required />
          </label>
        </div>
        <p className="muted small">
          Seating is first-come, first-served. The number of tickets is the capacity of the venue.
        </p>
      </section>

      <section className="card stack">
        <h2>Venue</h2>
        <label>
          Venue name
          <input value={f.venue_name} onChange={set('venue_name')} placeholder="The Reading Room" />
        </label>
        <label>
          Address / directions
          <input value={f.venue_address} onChange={set('venue_address')} placeholder="Plot 123, Main Mall" />
        </label>
        <MapPicker
          lat={f.venue_lat}
          lng={f.venue_lng}
          onChange={(lat, lng) => setF((prev) => ({ ...prev, venue_lat: lat, venue_lng: lng }))}
        />
      </section>

      <section className="card stack">
        <h2>Payment</h2>
        <label>
          Bank details shown to customers
          <textarea rows={5} value={f.bank_details} onChange={set('bank_details')}
                    placeholder={'Bank: …\nAccount name: …\nAccount number: …\nBranch: …'} />
        </label>
        <div className="grid2">
          <label>
            Payment reference prefix
            <input value={f.ref_prefix} onChange={set('ref_prefix')} maxLength={6} />
            <span className="muted small">Each order gets a code like {f.ref_prefix.toUpperCase() || 'TIX'}-K7X2Q to use as the transfer reference.</span>
          </label>
          <label>
            Hold unpaid tickets for (hours)
            <input type="number" min="1" max="168" value={f.hold_hours} onChange={set('hold_hours')} />
            <span className="muted small">After this, unpaid tickets go back on sale.</span>
          </label>
        </div>
      </section>

      <section className="card stack">
        <h2>Publishing</h2>
        <label>
          Status
          <select value={f.status} onChange={set('status')}>
            <option value="draft">Draft (hidden from customers)</option>
            <option value="published">Published (tickets on sale)</option>
            <option value="closed">Closed (hidden)</option>
          </select>
        </label>
        <label>
          Link name (optional)
          <input value={f.slug} onChange={set('slug')} placeholder="leave blank for an automatic one" />
          {editing && <span className="muted small">Changing this breaks links and QR codes you've already shared.</span>}
        </label>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
        </button>
      </div>
    </form>
  )
}
