import { useState, useCallback } from 'react'

const DISCOVER_PASSWORD = import.meta.env.VITE_DISCOVER_PASSWORD ?? ''

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('discover-unlocked') === '1',
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!DISCOVER_PASSWORD) {
        // No password configured — allow access
        setUnlocked(true)
        sessionStorage.setItem('discover-unlocked', '1')
        return
      }
      if (input === DISCOVER_PASSWORD) {
        setUnlocked(true)
        sessionStorage.setItem('discover-unlocked', '1')
      } else {
        setError('Password errata')
        setInput('')
      }
    },
    [input],
  )

  if (unlocked) return <>{children}</>

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <div className="text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h2 className="text-lg font-semibold text-slate-800">Accesso riservato</h2>
          <p className="text-xs text-slate-400 mt-1">
            Inserisci la password per accedere alla sezione Discover
          </p>
        </div>

        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError('') }}
          placeholder="Password…"
          autoFocus
          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-300"
        />

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button
          type="submit"
          className="w-full btn-primary py-2.5"
        >
          Accedi
        </button>
      </form>
    </div>
  )
}
