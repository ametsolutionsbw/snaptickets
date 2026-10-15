import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {
      window.prompt('Copy this:', text)
    }
  }
  return (
    <button type="button" className={`btn btn-sm ${className}`} onClick={copy}>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-ink3" />}
      {done ? 'Copied' : label}
    </button>
  )
}
