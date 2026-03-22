import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function fmt(n: number, decimals = 4): string {
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

function fmtUsd(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.01) return '<$0.01'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Position Row ──────────────────────────────────────────────────────────────

function PositionRow({ position, onAnalyze }: { position: WalletPosition; onAnalyze: (poolId: string) => void }) {
  const feePct = (position.feeTier / 10000).toFixed(2)
  const pair   = `${position.token0}/${position.token1}`
  const isClosed = position.status === 'closed'

  const hasUncollected = position.uncollectedFees0 > 0 || position.uncollectedFees1 > 0
  const hasCollected   = position.collectedFees0 > 0 || position.collectedFees1 > 0

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${
      isClosed
        ? 'border-slate-200 opacity-70'
        : position.inRange ? 'border-emerald-200' : 'border-amber-200'
    }`}>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-base ${isClosed ? 'text-slate-500' : 'text-slate-900'}`}>{pair}</span>
          <span className="text-xs text-slate-400 font-mono">{feePct}%</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
            position.version === 'v4' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
          }`}>
            {position.version.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {position.ilPercent !== null && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              position.ilPercent >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              IL {position.ilPercent >= 0 ? '+' : ''}{position.ilPercent.toFixed(2)}%
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isClosed
              ? 'bg-slate-100 text-slate-500'
              : position.inRange
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
          }`}>
            {isClosed ? 'Chiusa' : position.inRange ? 'In range' : 'Out of range'}
          </span>
        </div>
      </div>

      {/* ─── Body grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        {/* Range */}
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-slate-400 mb-1 font-medium">Range</div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Min</span>
              <span className="font-mono text-slate-700">{formatPrice(position.priceLower)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max</span>
              <span className="font-mono text-slate-700">{formatPrice(position.priceUpper)}</span>
            </div>
          </div>
        </div>

        {/* Initial capital (deposited) */}
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-slate-400 font-medium">Capitale iniziale</span>
            {position.initialValueUSD > 0 && (
              <span className="text-slate-700 font-mono text-xs font-semibold">{fmtUsd(position.initialValueUSD)}</span>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-500">{position.token0}</span>
              <span className="font-mono text-slate-700">{fmt(position.depositedToken0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{position.token1}</span>
              <span className="font-mono text-slate-700">{fmt(position.depositedToken1)}</span>
            </div>
          </div>
        </div>

        {/* Current amounts */}
        {!isClosed && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-slate-400 font-medium">Capitale attuale</span>
              {position.currentValueUSD > 0 && (
                <span className="text-slate-700 font-mono text-xs font-semibold">{fmtUsd(position.currentValueUSD)}</span>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{position.token0}</span>
                <span className="font-mono text-slate-700">{fmt(position.currentAmount0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{position.token1}</span>
                <span className="font-mono text-slate-700">{fmt(position.currentAmount1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fees */}
        {(hasUncollected || hasCollected) && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-400 mb-1 font-medium">Fee</div>
            {hasUncollected && (
              <div className="space-y-0.5 mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-amber-600 text-[10px] font-medium">Da prelevare</span>
                  {position.uncollectedFeesUSD > 0 && (
                    <span className="text-amber-700 font-mono text-xs font-semibold">{fmtUsd(position.uncollectedFeesUSD)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{position.token0}</span>
                  <span className="font-mono text-amber-700">{fmt(position.uncollectedFees0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{position.token1}</span>
                  <span className="font-mono text-amber-700">{fmt(position.uncollectedFees1)}</span>
                </div>
              </div>
            )}
            {hasCollected && (
              <div className="space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-emerald-600 text-[10px] font-medium">Ritirate</span>
                  {position.collectedFeesUSD > 0 && (
                    <span className="text-emerald-700 font-mono text-xs font-semibold">{fmtUsd(position.collectedFeesUSD)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{position.token0}</span>
                  <span className="font-mono text-emerald-700">{fmt(position.collectedFees0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{position.token1}</span>
                  <span className="font-mono text-emerald-700">{fmt(position.collectedFees1)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
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
  totalOpen:    number
  totalClosed:  number
  inRange:      number
  outOfRange:   number
  v3Count:      number
  v4Count:      number
}

function SummaryBar({ totalOpen, totalClosed, inRange, outOfRange, v3Count, v4Count }: SummaryBarProps) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
        <div className="text-2xl font-bold text-slate-900">{totalOpen}</div>
        <div className="text-slate-400 text-xs">Aperte</div>
      </div>
      {totalClosed > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[72px]">
          <div className="text-2xl font-bold text-slate-400">{totalClosed}</div>
          <div className="text-slate-400 text-xs">Chiuse</div>
        </div>
      )}
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

export default function MyPositions() {
  const navigate = useNavigate()
  const onSelectPool = (chain: string, address: string) => navigate(`/pool/${chain}/${address}`)
  const [chain,  setChain]  = useState<Chain>('ethereum')
  const [wallet, setWallet] = useState('')
  const [query,  setQuery]  = useState('')

  const { data, isLoading, isError, error } = useWalletPositions(chain, query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(wallet.trim())
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Le mie posizioni</h1>
          <p className="text-slate-500 text-sm mt-1">
            Posizioni LP su Uniswap V3 e V4 per un indirizzo wallet (sola lettura, nessuna connessione richiesta).
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shrink-0"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

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
              totalOpen={data.totalOpen}
              totalClosed={data.totalClosed}
              inRange={data.inRange}
              outOfRange={data.outOfRange}
              v3Count={data.v3Count}
              v4Count={data.v4Count}
            />

            {data.positions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nessuna posizione trovata su {chain} per questo wallet.
              </div>
            ) : (
              <div className="space-y-4">
                {data.positions.map((p) => (
                  <PositionRow
                    key={p.id}
                    position={p}
                    onAnalyze={(poolId) => onSelectPool(chain, poolId)}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400">
              Dati da The Graph + on-chain (fee, amounts) · aggiornati al {new Date(data.lastUpdated).toLocaleTimeString('it-IT')}
            </p>
          </div>
        )}
      </div>

      {/* SEO content */}
      <div className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <div className="border-t border-slate-200 pt-12 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm text-slate-500 leading-relaxed">
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Tracker posizioni Uniswap V3 e V4</h2>
            <p className="mb-3">
              Visualizza tutte le posizioni LP di un wallet su Uniswap V3 e V4 senza connettere il portafoglio.
              Inserisci un indirizzo Ethereum, Arbitrum, Base o Polygon per vedere le posizioni aperte e chiuse,
              il range di prezzo, la liquidità depositata e il <strong className="text-slate-600">controvalore in USD</strong> aggiornato in tempo reale.
            </p>
            <p>
              A differenza di altri tracker, le <strong className="text-slate-600">fee maturate (uncollected)</strong> vengono
              calcolate on-chain tramite la formula <code className="text-xs bg-slate-100 px-1 rounded">feeGrowthInside</code> del
              whitepaper Uniswap — non dal subgraph — garantendo dati accurati anche per posizioni V4 sul nuovo PoolManager.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Come vengono calcolate le fee</h2>
            <p className="mb-3">
              Le fee da prelevare (pending) sono la differenza tra il <em className="text-slate-600">feeGrowthInside</em> attuale
              della pool e l'ultimo snapshot registrato nella posizione, moltiplicata per la liquidità.
              Per le posizioni V3 il calcolo avviene leggendo il contratto <strong className="text-slate-600">NonfungiblePositionManager</strong>;
              per V4 si legge lo storage interno del <strong className="text-slate-600">PoolManager</strong> tramite <code className="text-xs bg-slate-100 px-1 rounded">extsload</code>.
            </p>
            <p>
              Le fee ritirate (collected) provengono dallo storico registrato dal subgraph The Graph
              e includono tutti i <code className="text-xs bg-slate-100 px-1 rounded">collect()</code> eseguiti dal wallet nel tempo.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Impermanent loss e capitale attuale</h2>
            <p className="mb-3">
              Per ogni posizione aperta viene calcolato il <strong className="text-slate-600">capitale attuale</strong> in token
              e in USD, derivato dalla liquidità e dal prezzo corrente della pool (formula V3 whitepaper §6.3).
              L'<strong className="text-slate-600">impermanent loss</strong> confronta il valore attuale della posizione LP
              con quello che avrebbe avuto facendo HODL dei token iniziali.
            </p>
            <p>
              Quando una posizione è completamente out-of-range, il capitale è interamente in un solo token:
              100% token0 se il prezzo è sotto il range, 100% token1 se è sopra.
              L'IL mostrato tiene conto di questa conversione forzata.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Chain e versioni supportate</h2>
            <ul className="space-y-1.5">
              {[
                ['Uniswap V3', 'posizioni lette dal subgraph, fee calcolate on-chain via NonfungiblePositionManager'],
                ['Uniswap V4', 'posizioni ricostruite da eventi ModifyLiquidity, fee via PoolManager extsload'],
                ['Ethereum', 'mainnet — pool con la TVL più alta'],
                ['Arbitrum', 'solo V3 (subgraph V4 non ancora disponibile)'],
                ['Base', 'V3 + V4, L2 di Coinbase'],
                ['Polygon', 'V3 + V4, sidechain EVM'],
              ].map(([name, desc]) => (
                <li key={name} className="flex gap-2">
                  <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
                  <span><span className="text-slate-600">{name}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
