import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const emailConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

// Link to the customer's private order/ticket page
export function orderLink(token) {
  return `${window.location.origin}${window.location.pathname}#/order/${token}`
}

// One generic EmailJS template is used for every email; the wording is built here.
export async function sendEmail({ to_email, to_name, subject, message, order_link, event_title }) {
  if (!emailConfigured) throw new Error('Email is not set up yet (missing EmailJS keys in .env).')
  if (!to_email) throw new Error('This customer has no email address.')
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { to_email, to_name, subject, message, order_link, event_title },
    { publicKey: PUBLIC_KEY }
  )
}

const first = (name) => (name || '').trim().split(/\s+/)[0] || 'there'

export function confirmationContent({ name, eventTitle, reference, quantity }) {
  const many = quantity > 1
  return {
    subject: `Your ${many ? 'tickets' : 'ticket'} for ${eventTitle} are confirmed`,
    message:
      `Hi ${first(name)},\n\n` +
      `Good news: your payment for ${eventTitle} (reference ${reference}) has been confirmed.\n\n` +
      `Your ${many ? `${quantity} tickets are` : 'ticket is'} ready. Open the link below to view ` +
      `${many ? 'them' : 'it'}, and keep it handy: you'll show the QR code at the door.\n\n` +
      `See you there!`,
  }
}

export function rejectionContent({ name, eventTitle, reference, reason }) {
  return {
    subject: `Update on your order ${reference} for ${eventTitle}`,
    message:
      `Hi ${first(name)},\n\n` +
      `We couldn't confirm your payment for ${eventTitle} (reference ${reference}).\n\n` +
      `Reason: ${reason}\n\n` +
      `Please contact the host, or place a new order from the event link.`,
  }
}
