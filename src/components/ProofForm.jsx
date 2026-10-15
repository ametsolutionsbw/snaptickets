import { useState } from 'react'
import { CloudUpload, FileText, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }
const MAX_BYTES = 5 * 1024 * 1024

export default function ProofForm({ token, order, onDone, submitLabel = 'Submit proof of payment' }) {
  const [file, setFile] = useState(null)
  const [payer, setPayer] = useState(order.payer_name || '')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pick(f) {
    setError('')
    if (!f) return
    if (!ALLOWED[f.type]) return setError('Please upload a screenshot or photo (JPG, PNG or WebP) or a PDF.')
    if (f.size > MAX_BYTES) return setError('That file is bigger than 5 MB. Please upload a smaller one, or a screenshot.')
    setFile(f)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!payer.trim()) return setError('Please enter the name on the bank account you paid from.')
    if (!file) return setError('Please choose your proof of payment.')

    setBusy(true)
    const path = `${order.id}/${crypto.randomUUID()}.${ALLOWED[file.type]}`
    const up = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type })
    if (up.error) {
      setBusy(false)
      return setError(`Upload failed: ${up.error.message}`)
    }
    const { error } = await supabase.rpc('submit_proof', {
      p_token: token,
      p_proof_path: path,
      p_payer_name: payer,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setFile(null)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="label" htmlFor="payer">Name on the bank account you paid from</label>
        <input id="payer" className="input" value={payer} onChange={(e) => setPayer(e.target.value)}
               placeholder="As it appears on your bank statement" />
        <p className="hint">This helps the host match your payment to your reservation.</p>
      </div>

      <div>
        <span className="label">Proof of payment</span>
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-6 w-6 shrink-0 text-brand-700" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-ink3">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button type="button" onClick={() => setFile(null)}
                    className="rounded-full p-1.5 text-ink3 transition hover:bg-sand hover:text-red-700"
                    aria-label="Remove file">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              drag ? 'border-brand-700 bg-brand-50' : 'border-line bg-[#faf8f5] hover:border-brand-700/60'
            }`}
          >
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf"
                   onChange={(e) => pick(e.target.files[0])} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink2">
              <CloudUpload className="h-5 w-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">
              <span className="text-brand-700 underline underline-offset-2">Choose a file</span> or drag it here
            </span>
            <span className="mt-1 text-xs text-ink3">
              A screenshot of the successful transfer or your bank's receipt (JPG, PNG, PDF · up to 5 MB)
            </span>
          </label>
        )}
      </div>

      {error && <p className="note note-red">{error}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={busy}>
        {busy ? 'Uploading…' : submitLabel}
      </button>
    </form>
  )
}
