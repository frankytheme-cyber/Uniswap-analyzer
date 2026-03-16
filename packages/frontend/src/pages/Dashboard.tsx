import { useWatchlist, usePoolAnalysis, useRefreshPool } from '../hooks/usePoolData.ts'
import PoolTable       from '../components/dashboard/PoolTable.tsx'
import PoolCard        from '../components/dashboard/PoolCard.tsx'
import ParameterLegend from '../components/dashboard/ParameterLegend.tsx'

interface Props {
  onSelectPool: (chain: string, address: string) => void
}

export default function Dashboard({ onSelectPool }: Props) {
  const { data: watchlist = [], isLoading } = useWatchlist()
  const refresh = useRefreshPool()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Il Tuo Portafoglio</h1>
        <p className="text-slate-500 text-sm mt-1">
          Analisi in tempo reale delle pool Uniswap V3 — aggiornamento ogni 15 minuti
        </p>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm">Caricamento watchlist…</div>
      ) : (
        <PoolTable entries={watchlist} onSelectPool={onSelectPool} />
      )}

      {watchlist.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Score Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((entry) => (
              <PoolCardWrapper
                key={entry.id}
                chain={entry.chain}
                address={entry.address}
                onSelect={() => onSelectPool(entry.chain, entry.address)}
                onRefresh={() => refresh.mutate({ chain: entry.chain, address: entry.address })}
                refreshing={refresh.isPending}
              />
            ))}
          </div>
        </div>
      )}
      <ParameterLegend />
    </div>
  )
}

function PoolCardWrapper({
  chain, address, onSelect, onRefresh, refreshing,
}: {
  chain: string
  address: string
  onSelect: () => void
  onRefresh: () => void
  refreshing: boolean
}) {
  const { data, isLoading, isError } = usePoolAnalysis(chain, address)

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse shadow-card">
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-xs">
        Errore nel caricare {address.slice(0, 8)}…
      </div>
    )
  }

  return (
    <PoolCard
      analysis={data}
      onClick={onSelect}
      onRefresh={onRefresh}
      loading={refreshing}
    />
  )
}
