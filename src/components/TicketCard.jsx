import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { formatDateTime } from '../lib/format'
import { downloadTicketImage } from '../lib/ticketImage'
import { Cover } from './ui.jsx'

export default function TicketCard({ ticket, event, index, total }) {
  const [qr, setQr] = useState('')
  const [saving, setSaving] = useState(false)
  const used = ticket.status === 'checked_in'
  const voided = ticket.status === 'void'

  useEffect(() => {
    // The QR holds only the secret token; the host's scanner looks it up.
    QRCode.toDataURL(ticket.qr_token, { width: 520, margin: 1, errorCorrectionLevel: 'M' }).then(setQr)
  }, [ticket.qr_token])

  async function save() {
    setSaving(true)
    try {
      await downloadTicketImage({ ticket, event, qrDataUrl: qr, index, total })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ticket mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between bg-brand-700 px-5 py-3.5 text-white">
        <span className="font-bold tracking-[0.18em]">ADMIT ONE</span>
        <span className="text-xs opacity-90">Ticket {index} of {total}</span>
      </div>
      <Cover path={event.cover_path} fallback={false} className="aspect-[3/1] w-full" alt="" />

      <div className="space-y-1 px-5 pb-4 pt-5 text-center">
        <h3 className="display text-2xl leading-tight">{event.title}</h3>
        <p className="text-sm font-medium">{formatDateTime(event.starts_at)}</p>
        {(event.venue_name || event.venue_address) && (
          <p className="text-xs text-ink3">{[event.venue_name, event.venue_address].filter(Boolean).join(' · ')}</p>
        )}
      </div>

      <div className="relative mx-5 flex justify-center border-t-2 border-dashed border-line py-5">
        {qr ? (
          <img src={qr} alt={`QR code for ticket ${ticket.code}`}
               className={`h-60 w-60 max-w-full ${used || voided ? 'opacity-15' : ''}`} />
        ) : (
          <div className="h-60 w-60 rounded-lg bg-sand" />
        )}
        {(used || voided) && (
          <div className="absolute inset-0 flex -rotate-12 items-center justify-center text-2xl font-extrabold uppercase tracking-widest text-red-700">
            {used ? 'Checked in' : 'Cancelled'}
          </div>
        )}
      </div>

      <div className="space-y-1 px-5 pb-5 text-center">
        <div className="font-mono text-xl font-bold tracking-widest">{ticket.code}</div>
        <div className="text-sm text-ink2">{ticket.holder_name}</div>
        <div className="no-print pt-3">
          <button className="btn btn-sm" onClick={save} disabled={!qr || saving}>
            <Download className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save as image'}
          </button>
        </div>
      </div>
    </div>
  )
}
