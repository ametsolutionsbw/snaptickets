export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function money(amount, currency = 'BWP') {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

// ISO string -> value for <input type="datetime-local"> in the user's timezone
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Public link for an event, valid on localhost and on GitHub Pages
export function publicEventUrl(slug) {
  return `${window.location.origin}${window.location.pathname}#/e/${slug}`
}

// Link that opens the venue in Google Maps (pin if we have one, else the address)
export function mapsUrl({ venue_lat, venue_lng, venue_name, venue_address }) {
  if (venue_lat != null && venue_lng != null) {
    return `https://www.google.com/maps?q=${venue_lat},${venue_lng}`
  }
  const q = [venue_name, venue_address].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''
}
