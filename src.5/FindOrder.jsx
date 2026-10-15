import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function FindOrder() {
  const navigate = useNavigate()
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = await supabase.rpc('lookup_order_token', {
      p_reference: reference,
      p_phone: phone,
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (!data) return setError("We couldn't find an order with that reference and phone number. Check both and try again.")
    navigate(`/order/${data}`)
  }

  return (
    <div className="page narrow">
      <form className="card stack" onSubmit={submit}>
        <div>
          <h1>Find my order</h1>
          <p className="muted">Enter your payment reference and the phone number you ordered with.</p>
        </div>
        <label>
          Payment reference
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. POEM-K7X2Q" required />
        </label>
        <label>
          Phone number
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Searching…' : 'Find my order'}</button>
        <p className="center-text"><Link to="/" className="small-link">Back</Link></p>
      </form>
    </div>
  )
}
