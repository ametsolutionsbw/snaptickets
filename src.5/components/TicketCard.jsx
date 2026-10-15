import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { formatDateTime } from '../lib/format'
import { downloadTicketImage } from '../lib/ticketImage'

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
    <div className={`ticket ${used || voided ? 'dim' : ''}`}>
      <div className="ticket-band">
        <span>ADMIT ONE</span>
        <span className="ticket-count">Ticket {index} of {total}</span>
      </div>

      <div className="ticket-body">
        <h2>{event.title}</h2>
        <p>{formatDateTime(event.starts_at)}</p>
        {(event.venue_name || event.venue_address) && (
          <p className="muted small">{[event.venue_name, event.venue_address].filter(Boolean).join(' · ')}</p>
        )}
      </div>

      <div className="ticket-qr">
        {qr ? <img src={qr} alt={`QR code for ticket ${ticket.code}`} /> : <div className="qr-placeholder" />}
        {used && <div className="ticket-stamp">Checked in</div>}
        {voided && <div className="ticket-stamp">Cancelled</div>}
      </div>

      <div className="ticket-foot">
        <div className="ref-code small-code">{ticket.code}</div>
        <div>{ticket.holder_name}</div>
        <div className="row no-print" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={save} disabled={!qr || saving}>
            {saving ? 'Saving…' : 'Save as image'}
          </button>
        </div>
      </div>
    </div>
  )
}
