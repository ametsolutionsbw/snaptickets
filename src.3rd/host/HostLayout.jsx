import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { APP_NAME } from '../config'
import Login from './Login.jsx'

export default function HostLayout() {
  // undefined = still checking, null = logged out
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="page"><p className="muted">Loading…</p></div>
  if (!session) return <Login />

  return (
    <>
      <header className="topbar">
        <Link to="/host" className="brand">{APP_NAME} <span className="tag">host</span></Link>
        <div className="topbar-right">
          <span className="muted hide-sm">{session.user.email}</span>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <main className="page">
        <Outlet context={{ session }} />
      </main>
    </>
  )
}
