import { useState } from 'react'
import type { WatchlistEntry } from '../../types.ts'
import { useAddToWatchlist, useRemoveFromWatchlist, useRawPool } from '../../hooks/usePoolData.ts'
import type { Chain } from '../../types.ts'

interface Props {
  entries:         WatchlistEntry[]
  onSelectPool:    (chain: string, address: string) => void
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
    : pool
      ? `${pool.token0.symbol}/${pool.token1.symbol}`
      : '—'

  const feeTier = pool ? ` ${(parseInt(pool.feeTier, 10) / 10000).toFixed(2)}%` : ''

  return (
    <tr
      className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/40 cursor-pointer"
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-900 text-indigo-300 text-xs px-2 py-0.5 rounded">
            {entry.chain}
          </span>
          <span className="text-white text-sm font-medium">{poolName}</span>
          {feeTier && (
            <span className="text-gray-500 text-xs bg-gray-800 px-1.5 py-0.5 rounded">{feeTier}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-gray-500 text-xs">
        {entry.address.slice(0, 10)}…{entry.address.slice(-6)}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {new Date(entry.addedAt).toLocaleDateString('it-IT')}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          className="text-gray-600 hover:text-red-400 text-xs transition-colors"
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

  const addMutation    = useAddToWatchlist()
  const removeMutation = useRemoveFromWatchlist()

  function handleAdd() {
    setError('')
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Indirizzo non valido (deve essere 0x + 40 caratteri hex)')
      return
    }
    addMutation.mutate(
      { chain, address },
      {
        onError: (e) => setError(String(e)),
        onSuccess: () => setAddress(''),
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* Add pool form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Aggiungi pool</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="0x indirizzo pool…"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
          />

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {addMutation.isPending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Pool list */}
      {entries.length === 0 ? (
        <div className="text-center text-gray-600 py-16 text-sm">
          Nessuna pool in watchlist. Aggiungine una sopra.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
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
