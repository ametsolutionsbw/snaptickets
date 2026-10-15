import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { APP_NAME } from '../config'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <form onSubmit={submit} className="card space-y-5 p-7 shadow-sm">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-white">
            {APP_NAME.charAt(0)}
          </span>
          <h1 className="display text-3xl">{APP_NAME}</h1>
          <p className="text-sm text-ink3">Host login</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)}
                 autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" value={password}
                 onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p className="note note-red">{error}</p>}
        <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
