import { formatDateTime, mapsUrl } from '../lib/format'

export default function EventSummary({ event, children }) {
  const link = mapsUrl(event)
  return (
    <div className="stack-sm">
      <h1>{event.title}</h1>
      <p>{formatDateTime(event.starts_at)}</p>
      {(event.venue_name || event.venue_address) && (
        <p className="muted">
          {[event.venue_name, event.venue_address].filter(Boolean).join(' · ')}
          {link && (
            <>
              {' '}
              <a href={link} target="_blank" rel="noreferrer">View on map</a>
            </>
          )}
        </p>
      )}
      {children}
    </div>
  )
}
