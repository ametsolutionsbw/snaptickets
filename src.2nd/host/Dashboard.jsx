import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { formatDateTime, money } from '../lib/format'

export default function Dashboard() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, slug, status, starts_at, capacity, ticket_price, currency')
      .order('starts_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setEvents(data)
      })
  }, [])

  return (
    <>
      <div className="row between">
        <h1>Your events</h1>
        <Link to="events/new" className="btn primary">+ New event</Link>
      </div>

      {error && <p className="error">{error}</p>}
      {!events && !error && <p className="muted">Loading…</p>}

      {events && events.length === 0 && (
        <div className="card center">
          <p>No events yet.</p>
          <Link to="events/new" className="btn primary">Create your first event</Link>
        </div>
      )}

      <div className="stack">
        {events?.map((ev) => (
          <Link key={ev.id} to={`events/${ev.id}`} className="card event-row">
            <div>
              <h2>{ev.title}</h2>
              <p className="muted">{formatDateTime(ev.starts_at)}</p>
              <p className="muted">
                {money(ev.ticket_price, ev.currency)} · {ev.capacity} tickets
              </p>
            </div>
            <span className={`badge ${ev.status}`}>{ev.status}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
