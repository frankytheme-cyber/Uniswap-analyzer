import { useState, useEffect, useRef, useCallback } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import CopyAddress from '../CopyAddress.tsx'
import type { WatchlistEntry } from '../../types.ts'
import { useAddToWatchlist, useRemoveFromWatchlist, useRawPool } from '../../hooks/usePoolData.ts'
import type { Chain } from '../../types.ts'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

function useAutoDetectChain(address: string) {
  const [detected, setDetected] = useState<Chain | null>(null)
  const [detecting, setDetecting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const isValid = /^0x[0-9a-fA-F]{40}$/.test(address) || /^0x[0-9a-fA-F]{64}$/.test(address)
    if (!isValid) { setDetected(null); return }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setDetecting(true)
    setDetected(null)

    const chains: Chain[] = ['ethereum', 'arbitrum', 'base', 'polygon']
    Promise.all(
      chains.map((c) =>
        fetch(`${API}/pools/${c}/${address}`, { signal: ctrl.signal })
          .then((r) => (r.ok ? c : null))
          .catch(() => null)
      )
    ).then((results) => {
      const found = results.find((c) => c !== null) ?? null
      setDetected(found as Chain | null)
      setDetecting(false)
    })

    return () => ctrl.abort()
  }, [address])

  return { detected, detecting }
}

interface Props {
  entries:      WatchlistEntry[]
  onSelectPool: (chain: string, address: string) => void
}

const CHAINS: Chain[] = ['ethereum', 'arbitrum', 'base', 'polygon']

function PoolRow({ entry, onSelect, onRemove, removing }: {
  entry:    WatchlistEntry
  onSelect: () => void
  onRemove: () => void
  removing: boolean
}) {
  const { data: pool, isLoading } = useRawPool(entry.chain, entry.address)

  const poolName = isLoading
    ? '…'
    : pool ? `${pool.token0.symbol}/${pool.token1.symbol}` : '—'

  const feeTierNum = pool ? parseInt(pool.feeTier, 10) : 0
  const feeTier    = pool && feeTierNum > 0 ? ` ${(feeTierNum / 10000).toFixed(2)}%` : ''
  const version    = entry.address.length === 66 ? 'V4' : 'V3'

  return (
    <tr
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded border border-indigo-100">
            {entry.chain}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
            version === 'V4'
              ? 'bg-violet-50 text-violet-600 border-violet-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            {version}
          </span>
          <span className="text-slate-800 text-sm font-medium">{poolName}</span>
          {feeTier && (
            <span className="text-slate-400 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{feeTier}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        <CopyAddress address={entry.address} prefixLen={10} suffixLen={6} />
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">
        {new Date(entry.addedAt).toLocaleDateString('it-IT')}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          className="text-slate-300 hover:text-red-500 text-xs transition-colors"
          disabled={removing}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
        >
          Rimuovi
        </button>
      </td>
    </tr>
  )
}

export default function PoolTable({ entries, onSelectPool }: Props) {
  const [address, setAddress] = useState('')
  const [chain, setChain]     = useState<Chain>('ethereum')
  const [error, setError]     = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  const { detected, detecting } = useAutoDetectChain(address)

  // Auto-select chain when detected
  useEffect(() => {
    if (detected) setChain(detected)
  }, [detected])

  const addMutation    = useAddToWatchlist()
  const removeMutation = useRemoveFromWatchlist()

  const handleAdd = useCallback(() => {
    setError('')
    const isV3 = /^0x[0-9a-fA-F]{40}$/.test(address)
    const isV4 = /^0x[0-9a-fA-F]{64}$/.test(address)
    if (!isV3 && !isV4) {
      setError('Indirizzo non valido — V3: 0x + 40 hex | V4 PoolId: 0x + 64 hex')
      return
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Completa la verifica CAPTCHA')
      return
    }
    addMutation.mutate(
      { chain, address, turnstileToken: turnstileToken || undefined },
      {
        onError: (e) => setError(String(e)),
        onSuccess: () => {
          setAddress('')
          setChain('ethereum')
          setTurnstileToken('')
          turnstileRef.current?.reset()
        },
      },
    )
  }, [address, chain, turnstileToken, addMutation])

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address) || /^0x[0-9a-fA-F]{64}$/.test(address)

  return (
    <div className="space-y-4">
      {/* Add pool form */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Aggiungi pool</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="0x indirizzo pool (V3: 40 hex, V4 PoolId: 64 hex)…"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-300"
          />

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
            className="btn-primary disabled:opacity-50"
          >
            {addMutation.isPending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </div>

        {/* Turnstile CAPTCHA */}
        {TURNSTILE_SITE_KEY && (
          <div className="mt-3 h-0 overflow-hidden">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken('')}
              options={{ theme: 'light', size: 'compact' }}
            />
          </div>
        )}

        {/* Auto-detect status */}
        {isValidAddress && (
          <div className="mt-2 text-xs">
            {detecting && (
              <span className="text-slate-400">Ricerca chain in corso…</span>
            )}
            {!detecting && detected && (
              <span className="text-emerald-600 font-medium">
                ✓ Pool trovata su <span className="capitalize">{detected}</span> — chain selezionata automaticamente
              </span>
            )}
            {!detecting && !detected && (
              <span className="text-red-500">Pool non trovata su nessuna chain supportata</span>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Pool list */}
      {entries.length === 0 ? (
        <div className="text-center text-slate-400 py-16 text-sm">
          Nessuna pool in watchlist. Aggiungine una sopra.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                <th className="text-left px-4 py-3">Pool</th>
                <th className="text-left px-4 py-3">Indirizzo</th>
                <th className="text-left px-4 py-3">Aggiunta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <PoolRow
                  key={entry.id}
                  entry={entry}
                  onSelect={() => onSelectPool(entry.chain, entry.address)}
                  onRemove={() => removeMutation.mutate(entry.id)}
                  removing={removeMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
