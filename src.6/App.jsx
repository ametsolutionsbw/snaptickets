import { Routes, Route, Link } from 'react-router-dom'
import { configured } from './supabaseClient'
import { APP_NAME } from './config'
import CustomerShell from './components/CustomerShell.jsx'
import HostLayout from './host/HostLayout.jsx'
import Dashboard from './host/Dashboard.jsx'
import EventForm from './host/EventForm.jsx'
import EventDetail from './host/EventDetail.jsx'
import OrdersPage from './host/OrdersPage.jsx'
import ScannerPage from './host/ScannerPage.jsx'
import GuestListPage from './host/GuestListPage.jsx'
import PublicEventPage from './PublicEventPage.jsx'
import OrderPage from './OrderPage.jsx'
import FindOrder from './FindOrder.jsx'

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card space-y-3 p-8">
        <h1 className="display text-2xl">Almost there</h1>
        <p className="text-sm leading-relaxed text-ink2">
          The app can't find your Supabase details. Copy <code className="rounded bg-sand px-1.5">.env.example</code> to{' '}
          <code className="rounded bg-sand px-1.5">.env</code>, fill in the values, then restart{' '}
          <code className="rounded bg-sand px-1.5">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

function Home() {
  return (
    <CustomerShell>
      <div className="card space-y-3 p-8 text-center">
        <h1 className="display text-3xl">{APP_NAME}</h1>
        <p className="text-sm text-ink2">
          Looking for tickets? Please open the event link or scan the QR code you were given.
        </p>
        <div className="flex items-center justify-center gap-4 pt-1 text-xs font-semibold">
          <Link to="/find">Find my order</Link>
          <Link to="/host" className="text-ink3">Host login</Link>
        </div>
      </div>
    </CustomerShell>
  )
}

export default function App() {
  if (!configured) return <SetupNotice />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/e/:slug" element={<PublicEventPage />} />
      <Route path="/order/:token" element={<OrderPage />} />
      <Route path="/find" element={<FindOrder />} />
      <Route path="/host" element={<HostLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="events/new" element={<EventForm />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="events/:id/edit" element={<EventForm />} />
        <Route path="events/:id/orders" element={<OrdersPage />} />
        <Route path="events/:id/scan" element={<ScannerPage />} />
        <Route path="events/:id/guests" element={<GuestListPage />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
