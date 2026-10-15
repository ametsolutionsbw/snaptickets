import { APP_NAME } from '../config'
import logoIcon from '../assets/logo-icon.png'

// Snaptickets logo: the icon plus the name as live text (stays sharp at any size).
export default function Brand({ className = '', size = 'md' }) {
  const s = size === 'lg' ? ['h-10', 'text-2xl'] : ['h-7', 'text-lg']
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <img src={logoIcon} alt="" className={`${s[0]} w-auto`} />
      <span className={`${s[1]} font-extrabold uppercase tracking-tight`}>{APP_NAME}</span>
    </span>
  )
}
