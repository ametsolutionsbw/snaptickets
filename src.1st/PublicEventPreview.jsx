import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { formatDateTime, money } from './lib/format'

// Temporary page so you can confirm publishing works end to end.
// Step 3 replaces this with the real ticket-buying page.
export default function PublicEventPreview() {
  const { slug } = useParams()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    supabase.rpc('get_public_event', { p_slug: slug }).then(({ data, error }) => {
      if (error) setState({ error: error.message })
      else setState({ event: data })
    })
  }, [slug])

  if (state.loading) return <div className="page narrow"><p className="muted">Loading…</p></div>

  if (state.error) return <div className="page narrow"><p className="error">{state.error}</p></div>

  if (!state.event) {
    return (
      <div className="page narrow">
        <div className="card center">
          <h1>Event not found</h1>
          <p className="muted">This event doesn't exist or isn't on sale right now.</p>
        </div>
      </div>
    )
  }

  const e = state.event
  return (
    <div className="page narrow">
      <div className="card stack">
        <p className="notice">Preview only: the ticket-buying page arrives in step 3.</p>
        <h1>{e.title}</h1>
        <p className="muted">{formatDateTime(e.starts_at)}</p>
        {e.venue_name && <p className="muted">{e.venue_name}</p>}
        <p>{money(e.ticket_price, e.currency)} per ticket</p>
        <p><strong>{e.remaining}</strong> of {e.capacity} tickets left</p>
      </div>
    </div>
  )
}
