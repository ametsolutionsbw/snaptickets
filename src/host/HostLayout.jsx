import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Brand from '../components/Brand.jsx'
import Login from './Login.jsx'

export default function HostLayout() {
  const [session, setSession] = useState(undefined) // undefined = checking, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="p-8 text-sm text-ink3">Loading…</p>
  if (!session) return <Login />

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/host" className="flex items-center gap-2.5 no-underline">
            <Brand />
            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Host</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-xs text-ink3 sm:inline">{session.user.email}</span>
            <button className="btn btn-sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <Outlet context={{ session }} />
      </main>
    </div>
  )
}
