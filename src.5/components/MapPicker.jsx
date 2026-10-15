import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_MAP_CENTER } from '../config'

const round = (n) => Math.round(n * 1e6) / 1e6

// Click the map to drop a pin. Uses OpenStreetMap (free, no account needed).
export default function MapPicker({ lat, lng, onChange }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')

  // Create the map once
  useEffect(() => {
    const hasPin = lat != null && lng != null
    const map = L.map(elRef.current).setView(hasPin ? [lat, lng] : DEFAULT_MAP_CENTER, hasPin ? 16 : 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.on('click', (e) => onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng)))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the marker in sync with lat/lng
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (lat == null || lng == null) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const icon = L.divIcon({
        className: 'pin',
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      })
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    }
  }, [lat, lng])

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setSearchMsg('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      )
      const results = await res.json()
      if (!results.length) {
        setSearchMsg('No match found. Try a nearby landmark, or just click the map.')
      } else {
        const la = round(parseFloat(results[0].lat))
        const ln = round(parseFloat(results[0].lon))
        mapRef.current.setView([la, ln], 17)
        onChangeRef.current(la, ln)
      }
    } catch {
      setSearchMsg('Search failed. You can still click the map to place the pin.')
    }
    setSearching(false)
  }

  return (
    <div className="stack-sm">
      <div className="row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              search()
            }
          }}
          placeholder="Search for the venue or area…"
        />
        <button type="button" className="btn" onClick={search} disabled={searching}>
          {searching ? '…' : 'Find'}
        </button>
      </div>
      {searchMsg && <p className="muted small">{searchMsg}</p>}
      <div ref={elRef} className="map" />
      <div className="row between">
        <span className="muted small">
          {lat != null ? `Pin: ${lat}, ${lng}` : 'Click the map to drop a pin (optional).'}
        </span>
        {lat != null && (
          <button type="button" className="btn ghost small" onClick={() => onChange(null, null)}>
            Remove pin
          </button>
        )}
      </div>
    </div>
  )
}
