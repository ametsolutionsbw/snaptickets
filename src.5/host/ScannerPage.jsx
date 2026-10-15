import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import jsQR from 'jsqr'
import { supabase } from '../supabaseClient'
import { feedback, prepareAudio } from '../lib/feedback'

const LABELS = {
  ok: { cls: 'ok', title: 'VALID', sub: 'Let them in' },
  already_checked_in: { cls: 'bad', title: 'ALREADY USED', sub: 'This ticket was scanned before' },
  invalid: { cls: 'bad', title: 'NOT A VALID TICKET', sub: 'Not recognised for this host' },
  void: { cls: 'bad', title: 'TICKET CANCELLED', sub: '' },
  wrong_event: { cls: 'bad', title: 'WRONG EVENT', sub: 'This ticket is for a different event' },
  error: { cls: 'warn', title: 'COULD NOT CHECK', sub: '' },
}

const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

export default function ScannerPage() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [stats, setStats] = useState(null)
  const [running, setRunning] = useState(false)
  const [camError, setCamError] = useState('')
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])
  const [manual, setManual] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const runningRef = useRef(false)
  const busyRef = useRef(false)
  const lastRef = useRef({ token: '', time: 0 })

  const refreshStats = useCallback(async () => {
    const { data } = await supabase.rpc('host_event_stats', { p_event_id: id })
    if (data) setStats(data)
  }, [id])

  useEffect(() => {
    supabase.from('events').select('title').eq('id', id).single().then(({ data }) => setEv(data))
    refreshStats()
  }, [id, refreshStats])

  async function checkIn(raw) {
    const token = String(raw || '').trim()
    if (!token) return
    busyRef.current = true
    const { data, error } = await supabase.rpc('check_in_ticket', { p_token: token, p_event_id: id })
    const r = error ? { result: 'error', message: error.message } : data
    setResult({ ...r, at: Date.now() })
    feedback(r.result)
    setRecent((prev) =>
      [{ key: Date.now(), result: r.result, name: r.holder_name, code: r.code }, ...prev].slice(0, 8)
    )
    if (r.result === 'ok') refreshStats()
    setTimeout(() => { busyRef.current = false }, 700)
  }

  function handleScan(data) {
    const now = Date.now()
    // Ignore the same code being seen repeatedly while it's held in front of the camera
    if (lastRef.current.token === data && now - lastRef.current.time < 4000) return
    lastRef.current = { token: data, time: now }
    checkIn(data)
  }

  function loop() {
    if (!runningRef.current) return
    const v = videoRef.current
    const canvas = canvasRef.current
    if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA && !busyRef.current) {
      const scale = Math.min(1, 640 / v.videoWidth)
      canvas.width = Math.round(v.videoWidth * scale)
      canvas.height = Math.round(v.videoHeight * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) handleScan(code.data)
    }
    timerRef.current = setTimeout(loop, 120)
  }

  async function start() {
    setCamError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      return setCamError('The camera is not available here. Open the site using its https:// link (or on localhost).')
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      v.srcObject = stream
      await v.play()
      runningRef.current = true
      setRunning(true)
      prepareAudio()
      loop()
    } catch (e) {
      setCamError(
        e?.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access for this site in your browser settings, then try again.'
          : `Could not start the camera (${e?.message || e?.name}).`
      )
    }
  }

  function stop() {
    runningRef.current = false
    clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRunning(false)
  }

  useEffect(() => stop, []) // switch the camera off when leaving the page

  function submitManual(e) {
    e.preventDefault()
    prepareAudio()
    checkIn(manual)
    setManual('')
  }

  const label = result && (LABELS[result.result] || LABELS.error)

  return (
    <div className="stack">
      <Link to={`/host/events/${id}`} className="small-link">← Back to event</Link>
      <div className="row between wrap">
        <h1>Scan tickets</h1>
        {stats && (
          <div className="checkin-count">
            <strong>{stats.checked_in}</strong> / {stats.tickets_confirmed} checked in
          </div>
        )}
      </div>
      {ev && <p className="muted">{ev.title}</p>}

      <div className="card stack">
        <div className={`scan-view ${running ? '' : 'off'}`}>
          <video ref={videoRef} playsInline muted />
          {running && <div className="scan-frame" />}
          {!running && <p className="muted center-text">Camera is off</p>}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {camError && <p className="error">{camError}</p>}
        {running ? (
          <button className="btn" onClick={stop}>Stop camera</button>
        ) : (
          <button className="btn primary big-btn" onClick={start}>Start camera</button>
        )}
        <p className="muted small">
          Only scan with this page. Scanning a ticket with the phone's normal camera app won't check anyone in.
        </p>
      </div>

      {result && (
        <div className={`scan-result ${label.cls}`}>
          <div className="scan-title">{label.title}</div>
          {result.holder_name && <div className="scan-name">{result.holder_name}</div>}
          {result.code && <div className="scan-code">{result.code}</div>}
          {result.result === 'already_checked_in' && result.checked_in_at && (
            <div>Checked in at {time(result.checked_in_at)}</div>
          )}
          {result.result === 'error' && <div>{result.message}</div>}
          {label.sub && result.result !== 'already_checked_in' && <div>{label.sub}</div>}
        </div>
      )}

      <form className="card stack" onSubmit={submitManual}>
        <h2>Type a ticket code</h2>
        <p className="muted small">If a QR code won't scan, enter the code printed under it (like T-8K3F9Q).</p>
        <div className="row">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="T-XXXXXX"
                 autoCapitalize="characters" />
          <button className="btn primary" disabled={!manual.trim()}>Check in</button>
        </div>
        <p className="small">
          Phone dead or can't find it? <Link to={`/host/events/${id}/guests`}>Look the guest up by name</Link>.
        </p>
      </form>

      {recent.length > 0 && (
        <div className="card stack-sm">
          <h2>Recent scans</h2>
          {recent.map((r) => (
            <div key={r.key} className="row between">
              <span>{r.name || 'Unknown'} <span className="muted small">{r.code}</span></span>
              <span className={`status ${r.result === 'ok' ? 'confirmed' : 'rejected'}`}>
                {r.result === 'ok' ? 'Checked in' : (LABELS[r.result] || LABELS.error).title.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
