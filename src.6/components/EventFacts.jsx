import { Calendar, ExternalLink, MapPin } from 'lucide-react'
import { formatDateTime, mapsUrl } from '../lib/format'

export default function EventFacts({ event, className = '' }) {
  const link = mapsUrl(event)
  const venue = [event.venue_name, event.venue_address].filter(Boolean).join(' · ')
  return (
    <div className={`space-y-2.5 text-[13px] text-ink2 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-ink3" />
        <span className="font-medium text-ink">{formatDateTime(event.starts_at)}</span>
      </div>
      {(venue || link) && (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink3" />
          <span>
            {venue && <span className="font-medium text-ink">{venue}</span>}
            {link && (
              <a href={link} target="_blank" rel="noreferrer"
                 className="ml-2 inline-flex items-center gap-0.5 font-semibold hover:underline">
                View on map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
