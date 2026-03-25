import { useState } from 'react'
import { LockIcon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useDiscoverPools, useAddToWatchlist } from '../hooks/usePoolData.ts'
import { useWatchlistStore } from '../stores/watchlist-store.ts'
import PoolCard from '../components/dashboard/PoolCard.tsx'
import Footer from '../components/Footer.tsx'
import type { Chain } from '../types.ts'

const CHAINS: { value: Chain; label: string }[] = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'base',     label: 'Base' },
  { value: 'polygon',  label: 'Polygon' },
]

type VersionFilter = 'all' | 'v3' | 'v4'

const VERSION_FILTERS: { value: VersionFilter; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'v3',  label: 'V3' },
  { value: 'v4',  label: 'V4' },
]

const POOL_LIMITS = [10, 25, 50] as const

export default function Discover() {
  const navigate = useNavigate()
  const onSelectPool = (chain: string, address: string) => navigate(`/pool/${chain}/${address}`)
  const onBack = () => navigate('/dashboard')
  const [chain, setChain]                   = useState<Chain>('ethereum')
  const [versionFilter, setVersionFilter]   = useState<VersionFilter>('all')
  const [limit, setLimit]                   = useState<number>(10)
  const { data, isLoading, isFetching, error } = useDiscoverPools(chain, limit)
  const addToWatchlist = useAddToWatchlist()
  const watchlistEntries = useWatchlistStore((s) => s.entries)

  const filteredPools = data?.pools.filter(
    (p) => versionFilter === 'all' || p.version === versionFilter
  ) ?? []

  return (
    <div className="min-h-screen flex flex-col">
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 flex-1">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 text-sm mb-3 transition-colors"
        >
          ← Dashboard
        </button>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          Discover Top Pools
          <LockIcon size={18} weight="duotone" className="text-slate-400" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Le migliori pool Uniswap V3 e V4 ordinate per punteggio
        </p>
      </div>

      {/* Chain selector + version filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {CHAINS.map((c) => (
            <button
              key={c.value}
              onClick={() => setChain(c.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                chain === c.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {VERSION_FILTERS.map((v) => (
              <button
                key={v.value}
                onClick={() => setVersionFilter(v.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  versionFilter === v.value
                    ? v.value === 'v4'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {POOL_LIMITS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm">
            Analizzando le migliori pool su {CHAINS.find((c) => c.value === chain)?.label}…
          </p>
          <p className="text-slate-400 text-xs mt-1">
            La prima analisi potrebbe richiedere fino a un minuto
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          Errore: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {versionFilter === 'all'
                ? `Top ${filteredPools.length} pool su ${data.totalCandidates} candidate (${data.analyzedCount} valutate)`
                : `${filteredPools.length} pool ${versionFilter.toUpperCase()} su ${data.pools.length} totali`
              }
            </span>
            {isFetching && (
              <span className="text-indigo-500 text-xs">Aggiornamento…</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPools.map((analysis, i) => (
              <div key={analysis.poolAddress} className="relative pt-4">
                {/* Rank badge */}
                <div className="absolute top-1 -left-1 z-10 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {i + 1}
                </div>
                {/* Watchlist star */}
                {(() => {
                  const inWatchlist = watchlistEntries.some(
                    (e) => e.address.toLowerCase() === analysis.poolAddress.toLowerCase() && e.chain === analysis.chain
                  )
                  return (
                    <button
                      className={`absolute top-1 right-0 z-10 text-lg leading-none transition-colors ${
                        inWatchlist ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!inWatchlist) addToWatchlist.mutate({ chain: analysis.chain, address: analysis.poolAddress })
                      }}
                      title={inWatchlist ? 'In watchlist' : 'Aggiungi a watchlist'}
                    >
                      {inWatchlist ? '★' : '☆'}
                    </button>
                  )
                })()}
                <PoolCard
                  analysis={analysis}
                  onClick={() => onSelectPool(analysis.chain, analysis.poolAddress)}
                  onRefresh={() => addToWatchlist.mutate({ chain: analysis.chain, address: analysis.poolAddress })}
                  loading={addToWatchlist.isPending}
                />
              </div>
            ))}
          </div>

          {filteredPools.length === 0 && (
            <p className="text-slate-400 text-center py-8">
              {versionFilter === 'all'
                ? 'Nessuna pool trovata su questa chain.'
                : `Nessuna pool ${versionFilter.toUpperCase()} trovata su questa chain.`
              }
            </p>
          )}
        </>
      )}
    </div>
    <Footer />
    </div>
  )
}
