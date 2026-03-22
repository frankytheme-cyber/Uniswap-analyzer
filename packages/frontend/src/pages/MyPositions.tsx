import { useState } from 'react'
import { useWalletPositions } from '../hooks/usePoolData.ts'
import type { WalletPosition } from '../types.ts'
import type { Chain } from '../types.ts'
import Footer from '../components/Footer.tsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHAINS: { id: Chain; label: string }[] = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'base',     label: 'Base' },
  { id: 'polygon',  label: 'Polygon' },
]

function formatNumber(n: number, decimals = 4): string {
  if (n === 0) return '0'
  if (Math.abs(n) < 0.0001) return n.toExponential(2)
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function formatPrice(p: number): string {
  if (p === 0) return '0'
  if (p < 0.001) return p.toExponential(3)
  if (p > 1_000_000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return p.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

// ── Position Card ─────────────────────────────────────────────────────────────

function PositionCard({ position, onAnalyze }: { position: WalletPosition; onAnalyze: (poolId: string) => void }) {
  const feePct = (position.feeTier / 10000).toFixed(2)
  const pair   = `${position.token0}/${position.token1}`

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 shadow-sm ${
      position.inRange ? 'border-emerald-200' : 'border-amber-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{pair}</span>
            <span className="text-xs text-slate-400 font-mono">{feePct}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
              position.version === 'v4'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-sky-100 text-sky-700'
            }`}>
              {position.version.toUpperCase()}
            </span>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
          position.inRange
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {position.inRange ? 'In range' : 'Out of range'}
        </span>
      </div>

      {/* Range */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-400 mb-0.5">Prezzo minimo</div>
          <div className="font-mono text-slate-700">{formatPrice(position.priceLower)}</div>
          <div className="text-slate-400">tick {position.tickLower}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-400 mb-0.5">Prezzo massimo</div>
          <div className="font-mono text-slate-700">{formatPrice(position.priceUpper)}</div>
          <div className="text-slate-400">tick {position.tickUpper}</div>
        </div>
      </div>

      {/* Net amounts */}
      <div className="text-xs space-y-1">
        <div className="text-slate-400 font-medium">Liquidità netta</div>
        <div className="flex justify-between">
          <span className="text-slate-600">{position.token0}</span>
          <span className="font-mono text-slate-800">{formatNumber(position.netToken0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">{position.token1}</span>
          <span className="font-mono text-slate-800">{formatNumber(position.netToken1)}</span>
        </div>
      </div>

      {/* Collected fees */}
      {(position.collectedFees0 > 0 || position.collectedFees1 > 0) && (
        <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
          <div className="text-slate-400 font-medium">Fee raccolte (tot.)</div>
          <div className="flex justify-between">
            <span className="text-slate-600">{position.token0}</span>
            <span className="font-mono text-emerald-700">{formatNumber(position.collectedFees0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{position.token1}</span>
            <span className="font-mono text-emerald-700">{formatNumber(position.collectedFees1)}</span>
          </div>
        </div>
      )}

      {/* Pool link */}
      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono truncate max-w-[160px]">
          Pool {position.poolId.slice(0, 10)}…
        </span>
        <button
          onClick={() => onAnalyze(position.poolId)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          Analizza pool →
        </button>
      </div>
    </div>
  )
}

// ── Summary Bar ───────────────────────────────────────────────────────────────

interface SummaryBarProps {
  total: number
  inRange: number
  outOfRange: number
  v3Count: number
  v4Count: number
}

function SummaryBar({ total, inRange, outOfRange, v3Count, v4Count }: SummaryBarProps) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
        <div className="text-2xl font-bold text-slate-900">{total}</div>
        <div className="text-slate-400 text-xs">Totale</div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
        <div className="text-2xl font-bold text-emerald-700">{inRange}</div>
        <div className="text-slate-500 text-xs">In range</div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
        <div className="text-2xl font-bold text-amber-700">{outOfRange}</div>
        <div className="text-slate-500 text-xs">Out of range</div>
      </div>
      {v3Count > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
          <div className="text-2xl font-bold text-sky-700">{v3Count}</div>
          <div className="text-slate-500 text-xs">V3</div>
        </div>
      )}
      {v4Count > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
          <div className="text-2xl font-bold text-violet-700">{v4Count}</div>
          <div className="text-slate-500 text-xs">V4</div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  onSelectPool: (chain: string, address: string) => void
}

export default function MyPositions({ onSelectPool }: Props) {
  const [chain,  setChain]  = useState<Chain>('ethereum')
  const [wallet, setWallet] = useState('')
  const [query,  setQuery]  = useState('')   // committed wallet address

  const { data, isLoading, isError, error } = useWalletPositions(chain, query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(wallet.trim())
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Le mie posizioni</h1>
          <p className="text-slate-500 text-sm mt-1">
            Posizioni LP aperte su Uniswap V3 e V4 per un indirizzo wallet (sola lettura, nessuna connessione richiesta).
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          {/* Chain selector */}
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shrink-0"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {/* Wallet input */}
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x... indirizzo wallet"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
            spellCheck={false}
          />

          <button
            type="submit"
            disabled={!/^0x[0-9a-fA-F]{40}$/.test(wallet.trim())}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Cerca
          </button>
        </form>

        {/* Results */}
        {isLoading && (
          <div className="text-slate-400 text-sm">Caricamento posizioni…</div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Errore nel caricamento delle posizioni.'}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <SummaryBar
              total={data.totalOpen}
              inRange={data.inRange}
              outOfRange={data.outOfRange}
              v3Count={data.v3Count}
              v4Count={data.v4Count}
            />

            {data.positions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nessuna posizione aperta trovata su {chain} per questo wallet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.positions.map((p) => (
                  <PositionCard
                    key={p.id}
                    position={p}
                    onAnalyze={(poolId) => onSelectPool(chain, poolId)}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400">
              Dati da The Graph (Uniswap V3 subgraph) · solo posizioni con liquidità &gt; 0 · aggiornati al {new Date(data.lastUpdated).toLocaleTimeString('it-IT')}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
