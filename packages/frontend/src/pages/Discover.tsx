import { useState } from 'react'
import { useDiscoverPools, useAddToWatchlist } from '../hooks/usePoolData.ts'
import { useWatchlistStore } from '../stores/watchlist-store.ts'
import PoolCard from '../components/dashboard/PoolCard.tsx'
import type { Chain } from '../types.ts'

const CHAINS: { value: Chain; label: string }[] = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'base',     label: 'Base' },
  { value: 'polygon',  label: 'Polygon' },
]

interface Props {
  onSelectPool: (chain: string, address: string) => void
  onBack: () => void
}

export default function Discover({ onSelectPool, onBack }: Props) {
  const [chain, setChain] = useState<Chain>('ethereum')
  const { data, isLoading, isFetching, error } = useDiscoverPools(chain)
  const addToWatchlist = useAddToWatchlist()
  const watchlistEntries = useWatchlistStore((s) => s.entries)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 text-sm mb-2 transition-colors"
          >
            &larr; Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Discover Top Pools</h1>
          <p className="text-gray-500 text-sm mt-1">
            Le migliori pool Uniswap V3 ordinate per punteggio
          </p>
        </div>
      </div>

      {/* Chain selector */}
      <div className="flex gap-2">
        {CHAINS.map((c) => (
          <button
            key={c.value}
            onClick={() => setChain(c.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              chain === c.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">
            Analizzando le migliori pool su {CHAINS.find((c) => c.value === chain)?.label}...
          </p>
          <p className="text-gray-600 text-xs mt-1">
            La prima analisi potrebbe richiedere fino a un minuto
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
          Errore: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Top {data.pools.length} pool su {data.totalCandidates} candidate analizzate ({data.analyzedCount} valutate)
            </span>
            {isFetching && (
              <span className="text-indigo-400 text-xs">Aggiornamento...</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.pools.map((analysis, i) => (
              <div key={analysis.poolAddress} className="relative pt-4">
                {/* Rank badge */}
                <div className="absolute top-1 -left-2 z-10 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
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
                        inWatchlist ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
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
                  onRefresh={() =>
                    addToWatchlist.mutate(
                      { chain: analysis.chain, address: analysis.poolAddress },
                    )
                  }
                  loading={addToWatchlist.isPending}
                />
              </div>
            ))}
          </div>

          {data.pools.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Nessuna pool trovata su questa chain.
            </p>
          )}
        </>
      )}
    </div>
  )
}
