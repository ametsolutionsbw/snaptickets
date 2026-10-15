// Remembers, on this device only, which order a customer started for an event,
// so they can get back to it if they close the tab.
const KEY = 'my-orders'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveOrder(slug, token) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [slug]: token }))
  } catch {
    /* storage blocked: not a problem */
  }
}

export function getOrderToken(slug) {
  return read()[slug] || null
}
