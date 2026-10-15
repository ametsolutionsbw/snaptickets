import { DEFAULT_COUNTRY_CODE } from '../config'

// Builds a WhatsApp link that opens a chat with a pre-written message.
export function whatsappUrl(phone, text) {
  const raw = String(phone || '').trim()
  let digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1)
  } else if (digits.length <= 8) {
    digits = DEFAULT_COUNTRY_CODE + digits
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
