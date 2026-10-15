import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import CustomerShell from './components/CustomerShell.jsx'

export default function FindOrder() {
  const navigate = useNavigate()
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Go back to wherever the customer came from (event page, order page...). Fall back to home.
  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = await supabase.rpc('lookup_order_token', { p_reference: reference, p_phone: phone })
    setBusy(false)
    if (error) return setError(error.message)
    if (!data) return setError("We couldn't find an order with that reference and phone number. Check both and try again.")
    navigate(`/order/${data}`)
  }

  return (
    <CustomerShell narrow>
      <form onSubmit={submit} className="card space-y-5 p-6 sm:p-7">
        <div>
          <h1 className="display text-3xl">Find my order</h1>
          <p className="mt-1 text-sm text-ink2">Enter your payment reference and the phone number you ordered with.</p>
        </div>
        <div>
          <label className="label" htmlFor="ref">Payment reference</label>
          <input id="ref" className="input font-mono uppercase" value={reference}
                 onChange={(e) => setReference(e.target.value)} placeholder="e.g. POEM-K7X2Q" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone number</label>
          <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        {error && <p className="note note-red">{error}</p>}
        <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Searching…' : 'Find my order'}</button>
        <p className="text-center">
          <button type="button" className="text-xs font-semibold text-ink2 hover:underline" onClick={goBack}>
            ← Go back
          </button>
        </p>
      </form>
    </CustomerShell>
  )
}
