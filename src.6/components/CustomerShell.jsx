import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { APP_NAME } from '../config'

// Page frame for everything customers see: slim header, centered column, footer.
export default function CustomerShell({ brand, children, wide = false }) {
  const name = brand || APP_NAME
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {name.trim().charAt(0).toUpperCase()}
            </div>
            <span className="truncate font-serif text-lg font-semibold italic tracking-tight">{name}</span>
          </div>
          <Link to="/find"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink2 transition hover:bg-sand hover:text-ink">
            <Search className="h-3.5 w-3.5" /> Find my order
          </Link>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? 'max-w-2xl' : 'max-w-xl'}`}>{children}</main>
      <footer className="no-print border-t border-line py-6 text-center text-xs text-ink3">
        © {new Date().getFullYear()} {name}. Payments are verified by the event organizer.
      </footer>
    </div>
  )
}
