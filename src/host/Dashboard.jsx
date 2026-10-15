import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDateTime, money } from '../lib/format'
import { Cover, StatusPill } from '../components/ui.jsx'

export default function Dashboard() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, slug, status, starts_at, capacity, ticket_price, currency, cover_path')
      .order('starts_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setEvents(data)
      })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl lg:text-4xl">Your events</h1>
        <Link to="events/new" className="btn btn-primary"><Plus className="h-4 w-4" /> New event</Link>
      </div>

      {error && <p className="note note-red">{error}</p>}
      {!events && !error && <p className="text-sm text-ink3">Loading…</p>}

      {events && events.length === 0 && (
        <div className="card space-y-4 p-10 text-center">
          <p className="text-ink2">No events yet. Create your first one to start selling tickets.</p>
          <div><Link to="events/new" className="btn btn-primary">Create your first event</Link></div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((ev) => (
          <Link key={ev.id} to={`events/${ev.id}`}
                className="card group overflow-hidden text-ink no-underline transition hover:border-brand-700/50 hover:shadow-sm">
            <Cover path={ev.cover_path} className="aspect-video w-full" />
            <div className="space-y-1.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="display text-xl leading-snug">{ev.title}</h2>
                <StatusPill status={ev.status} />
              </div>
              <p className="text-sm text-ink2">{formatDateTime(ev.starts_at)}</p>
              <p className="text-xs text-ink3">{money(ev.ticket_price, ev.currency)} · {ev.capacity} tickets</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
