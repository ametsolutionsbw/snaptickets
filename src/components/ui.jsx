import { Image as ImageIcon } from 'lucide-react'
import { coverUrl } from '../lib/images'

// Event cover. With fallback=false nothing is drawn when there is no image.
export function Cover({ path, className = '', fallback = true, alt = '' }) {
  const url = coverUrl(path)
  if (url) return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  if (!fallback) return null
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-brand-100 via-sand to-sand2 text-brand-700/50 ${className}`}>
      <ImageIcon className="h-6 w-6" />
    </div>
  )
}

const STATUS = {
  pending_payment: ['Awaiting payment', 'pill-amber'],
  proof_uploaded: ['Proof uploaded', 'pill-blue'],
  confirmed: ['Confirmed', 'pill-green'],
  rejected: ['Rejected', 'pill-red'],
  expired: ['Expired', 'pill-gray'],
  draft: ['Draft', 'pill-gray'],
  published: ['Published', 'pill-green'],
  closed: ['Closed', 'pill-red'],
}

export function StatusPill({ status, label }) {
  const [text, cls] = STATUS[status] || [status, 'pill-gray']
  return <span className={`pill ${cls}`}>{label || text}</span>
}

export function DatePlaque({ iso }) {
  const d = new Date(iso)
  return (
    <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-sand text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800">
        {d.toLocaleString(undefined, { month: 'short' })}
      </span>
      <span className="text-xl font-bold leading-none">{d.getDate()}</span>
    </div>
  )
}

export function Notice({ tone = 'amber', icon: Icon, children, className = '' }) {
  return (
    <div className={`note note-${tone} ${className}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function StepNumber({ n }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
      {n}
    </span>
  )
}
