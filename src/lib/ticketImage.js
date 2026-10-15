import { formatDateTime } from './format'

const SANS = "'Plus Jakarta Sans', system-ui, Arial, sans-serif"

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Draws the ticket onto a canvas and downloads it as a PNG (easy to keep on a phone).
export async function downloadTicketImage({ ticket, event, qrDataUrl, index, total }) {
  const W = 900
  const H = 1380
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'

  // background + card
  ctx.fillStyle = '#ece9e3'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  roundedRect(ctx, 40, 40, W - 80, H - 80, 32)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.clip()

  // header band
  ctx.fillStyle = '#c2410c'
  ctx.fillRect(40, 40, W - 80, 140)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 46px ${SANS}`
  ctx.fillText('ADMIT ONE', W / 2, 125)
  ctx.restore()

  // event details
  let y = 270
  ctx.fillStyle = '#2a2522'
  ctx.font = 'italic 700 58px Newsreader, Georgia, serif'
  for (const line of wrapText(ctx, event.title, W - 200).slice(0, 3)) {
    ctx.fillText(line, W / 2, y)
    y += 70
  }
  y += 10
  ctx.font = `34px ${SANS}`
  ctx.fillText(formatDateTime(event.starts_at), W / 2, y)
  y += 50
  const venue = [event.venue_name, event.venue_address].filter(Boolean).join(' · ')
  if (venue) {
    ctx.fillStyle = '#787268'
    ctx.font = `30px ${SANS}`
    for (const line of wrapText(ctx, venue, W - 200).slice(0, 2)) {
      ctx.fillText(line, W / 2, y)
      y += 42
    }
  }

  // dashed divider
  y += 20
  ctx.strokeStyle = '#dcd8d0'
  ctx.lineWidth = 3
  ctx.setLineDash([14, 12])
  ctx.beginPath()
  ctx.moveTo(100, y)
  ctx.lineTo(W - 100, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 50

  // QR code
  const qr = await loadImage(qrDataUrl)
  const qrSize = 480
  ctx.drawImage(qr, (W - qrSize) / 2, y, qrSize, qrSize)
  y += qrSize + 70

  // code + holder
  ctx.fillStyle = '#2a2522'
  ctx.font = 'bold 56px ui-monospace, Menlo, Consolas, monospace'
  ctx.fillText(ticket.code, W / 2, y)
  y += 60
  ctx.font = `36px ${SANS}`
  ctx.fillText(ticket.holder_name, W / 2, y)
  y += 48
  ctx.fillStyle = '#787268'
  ctx.font = `28px ${SANS}`
  ctx.fillText(`Ticket ${index} of ${total}`, W / 2, y)

  ctx.fillText('Show this QR code at the entrance', W / 2, H - 80)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ticket-${ticket.code}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
