import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ImagePlus, Replace, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DEFAULT_CURRENCY } from '../config'
import { toLocalInput } from '../lib/format'
import { coverUrl, prepareCover, removeCover, uploadCover } from '../lib/images'
import MapPicker from '../components/MapPicker.jsx'

const EMPTY = {
  title: '', description: '', slug: '', starts_at: '', sales_deadline: '',
  ticket_price: '', currency: DEFAULT_CURRENCY, capacity: '',
  venue_name: '', venue_address: '', venue_lat: null, venue_lng: null,
  bank_details: '', contact_email: '', contact_phone: '',
  ref_prefix: 'TIX', hold_hours: 24, status: 'draft', cover_path: null,
}

function Section({ title, hint, children }) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink3">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

// Loads the event first (when editing) so the form and map start with the right values.
export default function EventForm() {
  const { id } = useParams()
  const [initial, setInitial] = useState(id ? null : EMPTY)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.from('events').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) return setLoadError(error.message)
      setInitial({
        ...EMPTY,
        ...data,
        description: data.description ?? '',
        venue_name: data.venue_name ?? '',
        venue_address: data.venue_address ?? '',
        bank_details: data.bank_details ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        starts_at: toLocalInput(data.starts_at),
        sales_deadline: toLocalInput(data.sales_deadline),
        ticket_price: String(data.ticket_price),
        capacity: String(data.capacity),
      })
    })
  }, [id])

  if (loadError) return <p className="note note-red">{loadError}</p>
  if (!initial) return <p className="text-sm text-ink3">Loading…</p>
  return <EventFormInner id={id} initial={initial} />
}

function EventFormInner({ id, initial }) {
  const navigate = useNavigate()
  const { session } = useOutletContext()
  const [f, setF] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const editing = Boolean(id)
  const fileRef = useRef(null)

  // Cover image: a newly picked image waits here until the form is saved.
  const [newCover, setNewCover] = useState(null) // { blob, preview }
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [coverMsg, setCoverMsg] = useState('')
  const shownCover = newCover ? newCover.preview : coverRemoved ? '' : coverUrl(f.cover_path)

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }))

  async function pickCover(file) {
    setCoverMsg('')
    if (!file) return
    try {
      const blob = await prepareCover(file)
      if (newCover) URL.revokeObjectURL(newCover.preview)
      setNewCover({ blob, preview: URL.createObjectURL(blob) })
      setCoverRemoved(false)
    } catch (err) {
      setCoverMsg(err.message)
    }
  }

  function dropCover() {
    if (newCover) URL.revokeObjectURL(newCover.preview)
    setNewCover(null)
    setCoverRemoved(true)
  }

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
    if (f.contact_email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.contact_email.trim())) {
      return setError('The contact email does not look right.')
    }
    if (f.status === 'published' && !f.bank_details.trim()) {
      return setError('Add your bank details before publishing, so customers know where to pay.')
    }

    setBusy(true)

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

    // Upload the new cover first (if any) so we have its path to save.
    let coverPath = coverRemoved ? null : f.cover_path
    if (newCover) {
      try {
        coverPath = await uploadCover(session.user.id, newCover.blob)
      } catch (err) {
        setBusy(false)
        return setError(`Cover upload failed: ${err.message}`)
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
      contact_email: f.contact_email.trim() || null,
      contact_phone: f.contact_phone.trim() || null,
      ref_prefix: prefix,
      hold_hours: hold,
      status: f.status,
      cover_path: coverPath,
    }
    if (slug) payload.slug = slug

    const result = editing
      ? await supabase.from('events').update(payload).eq('id', id).select('id').single()
      : await supabase.from('events').insert(payload).select('id').single()

    setBusy(false)
    if (result.error) {
      if (newCover) await removeCover(coverPath) // don't leave an orphaned upload behind
      if (result.error.code === '23505') return setError('That link name is already taken. Try another.')
      return setError(result.error.message)
    }

    // Saved: clean up the old image if it was replaced or removed.
    if (initial.cover_path && initial.cover_path !== coverPath) await removeCover(initial.cover_path)
    navigate(`/host/events/${result.data.id}`)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl lg:text-4xl">{editing ? 'Edit event' : 'New event'}</h1>
      </div>

      <Section title="Cover image" hint="Shown on your event page, order pages and tickets. A landscape (16:9) image works best.">
        {shownCover ? (
          <div className="grid gap-5 md:grid-cols-5 md:items-center">
            <img src={shownCover} alt="Cover preview" className="aspect-video w-full rounded-xl border border-line object-cover md:col-span-3" />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                <Replace className="h-3.5 w-3.5" /> Replace
              </button>
              <button type="button" className="btn btn-sm text-red-700" onClick={dropCover}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="coverfile"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickCover(e.dataTransfer.files[0]) }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-[#faf8f5] p-8 text-center transition hover:border-brand-700/60"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink2">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">
              <span className="text-brand-700 underline underline-offset-2">Choose an image</span> or drag it here
            </span>
            <span className="mt-1 text-xs text-ink3">JPG, PNG or WebP. We shrink it automatically.</span>
          </label>
        )}
        <input id="coverfile" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
               onChange={(e) => { pickCover(e.target.files[0]); e.target.value = '' }} />
        {coverMsg && <p className="note note-red">{coverMsg}</p>}
      </Section>

      <Section title="Basics">
        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <div className="space-y-4 lg:col-span-3">
            <div>
              <label className="label" htmlFor="title">Event title</label>
              <input id="title" className="input" value={f.title} onChange={set('title')} placeholder="An Evening of Spoken Word" required />
            </div>
            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea id="desc" rows={5} className="input" value={f.description} onChange={set('description')}
                        placeholder="Tell people what to expect: line-up, dress code, doors open…" />
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div>
              <label className="label" htmlFor="starts">Event starts</label>
              <input id="starts" type="datetime-local" className="input" value={f.starts_at} onChange={set('starts_at')} required />
            </div>
            <div>
              <label className="label" htmlFor="deadline">Ticket sales close</label>
              <input id="deadline" type="datetime-local" className="input" value={f.sales_deadline} onChange={set('sales_deadline')} required />
              <p className="hint">Must be on or before the event start.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Tickets & price" hint="Seating is first-come, first-served. The number of tickets is the capacity of the venue.">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr]">
          <div>
            <label className="label" htmlFor="price">Price per ticket</label>
            <input id="price" type="number" min="0" step="0.01" className="input" value={f.ticket_price} onChange={set('ticket_price')} required />
          </div>
          <div>
            <label className="label" htmlFor="cur">Currency</label>
            <input id="cur" className="input uppercase" value={f.currency} onChange={set('currency')} maxLength={3} />
          </div>
          <div>
            <label className="label" htmlFor="cap">Number of tickets</label>
            <input id="cap" type="number" min="1" step="1" className="input" value={f.capacity} onChange={set('capacity')} required />
          </div>
        </div>
      </Section>

      <Section title="Venue">
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="vname">Venue name</label>
              <input id="vname" className="input" value={f.venue_name} onChange={set('venue_name')} placeholder="The Reading Room" />
            </div>
            <div>
              <label className="label" htmlFor="vaddr">Address / directions</label>
              <input id="vaddr" className="input" value={f.venue_address} onChange={set('venue_address')} placeholder="Plot 123, Main Mall" />
            </div>
            <p className="hint">Drop a pin on the map so guests can open directions in one tap.</p>
          </div>
          <MapPicker lat={f.venue_lat} lng={f.venue_lng}
                     onChange={(lat, lng) => setF((prev) => ({ ...prev, venue_lat: lat, venue_lng: lng }))} />
        </div>
      </Section>

      <Section title="Payment">
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <div>
          <label className="label" htmlFor="bank">Bank details shown to customers</label>
          <textarea id="bank" rows={6} className="input" value={f.bank_details} onChange={set('bank_details')}
                    placeholder={'Bank: …\nAccount name: …\nAccount number: …\nBranch: …'} />
          <p className="hint">Customers see this after choosing tickets, together with their unique payment reference.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="prefix">Payment reference prefix</label>
            <input id="prefix" className="input uppercase" value={f.ref_prefix} onChange={set('ref_prefix')} maxLength={6} />
            <p className="hint">Each order gets a code like {f.ref_prefix.toUpperCase() || 'TIX'}-K7X2Q to use as the transfer reference.</p>
          </div>
          <div>
            <label className="label" htmlFor="hold">Hold unpaid tickets for (hours)</label>
            <input id="hold" type="number" min="1" max="168" className="input" value={f.hold_hours} onChange={set('hold_hours')} />
            <p className="hint">After this, unpaid tickets go back on sale.</p>
          </div>
        </div>
        </div>
      </Section>

      <Section title="Host contact" hint="Shown to customers on their order page so they know who to reach if something goes wrong. Both are optional.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cemail">Contact email</label>
            <input id="cemail" type="email" className="input" value={f.contact_email} onChange={set('contact_email')} />
          </div>
          <div>
            <label className="label" htmlFor="cphone">Contact phone / WhatsApp</label>
            <input id="cphone" type="tel" className="input" value={f.contact_phone} onChange={set('contact_phone')} />
          </div>
        </div>
      </Section>

      <Section title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" className="input" value={f.status} onChange={set('status')}>
              <option value="draft">Draft (hidden from customers)</option>
              <option value="published">Published (tickets on sale)</option>
              <option value="closed">Closed (hidden)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="slug">Link name (optional)</label>
            <input id="slug" className="input" value={f.slug} onChange={set('slug')} placeholder="leave blank for an automatic one" />
            {editing && <p className="hint">Changing this breaks links and QR codes you've already shared.</p>}
          </div>
        </div>
      </Section>

      {error && <p className="note note-red">{error}</p>}
      <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="hidden text-xs text-ink3 sm:block">Changes are saved when you press the button.</span>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link to={editing ? `/host/events/${id}` : '/host'} className="btn flex-1 sm:flex-none">Cancel</Link>
          <button className="btn btn-primary flex-1 sm:flex-none" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </form>
  )
}
