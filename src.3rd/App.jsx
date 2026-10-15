import { Routes, Route, Link } from 'react-router-dom'
import { configured } from './supabaseClient'
import { APP_NAME } from './config'
import HostLayout from './host/HostLayout.jsx'
import Dashboard from './host/Dashboard.jsx'
import EventForm from './host/EventForm.jsx'
import EventDetail from './host/EventDetail.jsx'
import OrdersPage from './host/OrdersPage.jsx'
import PublicEventPage from './PublicEventPage.jsx'
import OrderPage from './OrderPage.jsx'
import FindOrder from './FindOrder.jsx'

function SetupNotice() {
  return (
    <div className="page narrow">
      <div className="card">
        <h1>Almost there</h1>
        <p>
          The app can't find your Supabase details. Copy <code>.env.example</code> to{' '}
          <code>.env</code>, fill in <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

function Home() {
  return (
    <div className="page narrow">
      <div className="card center">
        <h1>{APP_NAME}</h1>
        <p className="muted">
          Looking for tickets? Please open the event link or scan the QR code you were given.
        </p>
        <p>
          <Link to="/host" className="small-link">Host login</Link>
        </p>
      </div>
    </div>
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
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
