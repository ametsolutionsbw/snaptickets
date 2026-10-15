import { useState } from 'react'

export default function CopyButton({ text, label = 'Copy' }) {
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
    <button type="button" className="btn small" onClick={copy}>
      {done ? 'Copied ✓' : label}
    </button>
  )
}
