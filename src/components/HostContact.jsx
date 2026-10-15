import { Mail, Phone } from 'lucide-react'
import { whatsappUrl } from '../lib/contact'

// "Need help?" row. Renders nothing if the host gave no contact details.
export default function HostContact({ event, reference }) {
  const { contact_email: email, contact_phone: phone } = event
  if (!email && !phone) return null
  const wa = phone ? whatsappUrl(phone, `Hi, I need help with my order ${reference}`) : ''
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink2">
      <span>Need help? Contact the host:</span>
      {email && (
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Order ${reference}`)}`}
           className="inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-2 hover:text-brand-700">
          <Mail className="h-4 w-4" /> {email}
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-2 hover:text-brand-700">
          <Phone className="h-4 w-4" /> WhatsApp
        </a>
      )}
    </div>
  )
}
