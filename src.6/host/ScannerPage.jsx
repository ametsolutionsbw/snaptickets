import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CameraOff } from 'lucide-react'
import jsQR from 'jsqr'
import { supabase } from '../supabaseClient'
import { feedback, prepareAudio } from '../lib/feedback'

const LABELS = {
  ok: { cls: 'bg-emerald-700', title: 'VALID', sub: 'Let them in' },
  already_checked_in: { cls: 'bg-red-700', title: 'ALREADY USED', sub: 'This ticket was scanned before' },
  invalid: { cls: 'bg-red-700', title: 'NOT A VALID TICKET', sub: 'Not recognised for this host' },
  void: { cls: 'bg-red-700', title: 'TICKET CANCELLED', sub: '' },
  wrong_event: { cls: 'bg-red-700', title: 'WRONG EVENT', sub: 'This ticket is for a different event' },
  error: { cls: 'bg-amber-700', title: 'COULD NOT CHECK', sub: '' },
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
    setRecent((prev) => [{ key: Date.now(), result: r.result, name: r.holder_name, code: r.code }, ...prev].slice(0, 8))
    if (r.result === 'ok') refreshStats()
    setTimeout(() => { busyRef.current = false }, 700)
  }

  function handleScan(data) {
    const now = Date.now()
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
    <div className="mx-auto max-w-xl space-y-5">
      <Link to={`/host/events/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 no-underline hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to event
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Scan tickets</h1>
          {ev && <p className="text-sm text-ink2">{ev.title}</p>}
        </div>
        {stats && (
          <div className="rounded-full border border-line bg-white px-4 py-1.5 text-sm">
            <strong className="text-base">{stats.checked_in}</strong> / {stats.tickets_confirmed} checked in
          </div>
        )}
      </div>

      <div className="card space-y-4 p-4">
        <div className={`relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl ${running ? 'bg-black' : 'border border-dashed border-line bg-sand'}`}>
          <video ref={videoRef} playsInline muted className={`max-h-[60vh] w-full object-cover ${running ? '' : 'hidden'}`} />
          {running && (
            <div className="pointer-events-none absolute aspect-square w-3/5 max-w-[260px] rounded-3xl border-4 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          )}
          {!running && (
            <div className="flex flex-col items-center gap-2 text-ink3">
              <CameraOff className="h-7 w-7" />
              <span className="text-sm">Camera is off</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {camError && <p className="note note-red">{camError}</p>}
        {running ? (
          <button className="btn w-full" onClick={stop}>Stop camera</button>
        ) : (
          <button className="btn btn-primary btn-lg w-full" onClick={start}>
            <Camera className="h-4 w-4" /> Start camera
          </button>
        )}
        <p className="text-xs text-ink3">
          Only scan with this page. Scanning a ticket with the phone's normal camera app won't check anyone in.
        </p>
      </div>

      {result && (
        <div className={`${label.cls} space-y-1 rounded-2xl p-6 text-center text-white`}>
          <div className="text-3xl font-extrabold tracking-wide">{label.title}</div>
          {result.holder_name && <div className="text-xl">{result.holder_name}</div>}
          {result.code && <div className="font-mono opacity-90">{result.code}</div>}
          {result.result === 'already_checked_in' && result.checked_in_at && <div>Checked in at {time(result.checked_in_at)}</div>}
          {result.result === 'error' && <div>{result.message}</div>}
          {label.sub && result.result !== 'already_checked_in' && <div>{label.sub}</div>}
        </div>
      )}

      <form className="card space-y-3 p-5" onSubmit={submitManual}>
        <div>
          <h2 className="text-base font-bold">Type a ticket code</h2>
          <p className="text-xs text-ink3">If a QR code won't scan, enter the code printed under it (like T-8K3F9Q).</p>
        </div>
        <div className="flex gap-2">
          <input className="input font-mono uppercase" value={manual} onChange={(e) => setManual(e.target.value)}
                 placeholder="T-XXXXXX" autoCapitalize="characters" />
          <button className="btn btn-primary" disabled={!manual.trim()}>Check in</button>
        </div>
        <p className="text-xs">
          Phone dead or can't find it? <Link to={`/host/events/${id}/guests`} className="font-semibold">Look the guest up by name</Link>.
        </p>
      </form>

      {recent.length > 0 && (
        <div className="card space-y-2 p-5">
          <h2 className="text-base font-bold">Recent scans</h2>
          {recent.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
              <span>{r.name || 'Unknown'} <span className="font-mono text-xs text-ink3">{r.code}</span></span>
              <span className={`pill ${r.result === 'ok' ? 'pill-green' : 'pill-red'}`}>
                {r.result === 'ok' ? 'Checked in' : (LABELS[r.result] || LABELS.error).title.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
