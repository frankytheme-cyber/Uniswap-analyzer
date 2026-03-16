import { useState } from 'react'

interface Props {
  address: string
  /** How many leading chars to show. Default 10 */
  prefixLen?: number
  /** How many trailing chars to show. Default 6 */
  suffixLen?: number
  className?: string
}

export default function CopyAddress({ address, prefixLen = 10, suffixLen = 6, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  const short = `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={copy}
      title={copied ? 'Copiato!' : `Copia indirizzo\n${address}`}
      className={`group inline-flex items-center gap-1 font-mono text-slate-400 hover:text-slate-600 transition-colors ${className}`}
    >
      <span>{short}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {copied ? (
          <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </span>
    </button>
  )
}
