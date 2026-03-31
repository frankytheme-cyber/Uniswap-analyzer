import { useNavigate } from 'react-router-dom'
import { useWatchlist, usePoolAnalysis, useRefreshPool } from '../hooks/usePoolData.ts'
import PoolTable       from '../components/dashboard/PoolTable.tsx'
import PoolCard        from '../components/dashboard/PoolCard.tsx'
import ParameterLegend from '../components/dashboard/ParameterLegend.tsx'
import Footer          from '../components/Footer.tsx'
import SEO             from '../components/SEO.tsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const onSelectPool = (chain: string, address: string) => navigate(`/pool/${chain}/${address}`)
  const { data: watchlist = [], isLoading } = useWatchlist()
  const refresh = useRefreshPool()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      <SEO
        title="Dashboard — Watchlist Pool"
        description="Monitora la salute delle tue pool Uniswap V3 in tempo reale. Analisi automatica di TVL, volume, fee APR, efficienza del capitale e impermanent loss su Ethereum, Arbitrum, Base e Polygon."
      />
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1 min-w-0">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Il Tuo Portafoglio</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Analisi in tempo reale delle pool Uniswap V3 — aggiornamento ogni 15 min
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
      <Footer />
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
      <div
        className="rounded-lg p-4 animate-pulse shadow-card border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="h-4 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--bg-raised)' }} />
        <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--bg-raised)' }} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div
        className="rounded-lg p-4 text-xs border"
        style={{
          backgroundColor: 'var(--bad-bg)',
          borderColor: 'var(--bad-border)',
          color: 'var(--bad-text)',
        }}
      >
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
