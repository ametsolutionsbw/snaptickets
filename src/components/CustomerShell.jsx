import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { APP_NAME } from '../config'
import Brand from './Brand.jsx'

// Page frame for everything customers see. `narrow` is for small forms; the default is
// a wide, two-column-capable layout for laptops that stacks neatly on phones.
export default function CustomerShell({ children, narrow = false }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <Link to="/find"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink2 transition hover:bg-sand hover:text-ink">
            <Search className="h-3.5 w-3.5" /> Find my order
          </Link>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:py-12 ${narrow ? 'max-w-md' : 'max-w-6xl'}`}>
        {children}
      </main>
      <footer className="no-print border-t border-line py-6 text-center text-xs text-ink3">
        © {new Date().getFullYear()} {APP_NAME}. Payments are verified directly by the event organizer.
      </footer>
    </div>
  )
}
