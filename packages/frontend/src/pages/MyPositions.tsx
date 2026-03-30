import { useState, type ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWalletPositions } from '../hooks/usePoolData.ts'
import type { WalletPosition } from '../types.ts'
import type { Chain } from '../types.ts'
import Footer from '../components/Footer.tsx'
import SEO from '../components/SEO.tsx'

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

function TokenAmounts({ token0, token1, amount0, amount1, color = 'slate' }: {
  token0: string; token1: string; amount0: number; amount1: number; color?: 'slate' | 'amber' | 'emerald'
}) {
  const textColor = color === 'amber' ? 'text-amber-700' : color === 'emerald' ? 'text-emerald-700' : 'text-slate-700'
  return (
    <div className="space-y-1 mt-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0">{token0}</span>
        <span className={`font-mono text-[11px] sm:text-xs truncate ${textColor}`}>{fmt(amount0)}</span>
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0">{token1}</span>
        <span className={`font-mono text-[11px] sm:text-xs truncate ${textColor}`}>{fmt(amount1)}</span>
      </div>
    </div>
  )
}

function DataCell({ label, usd, children, accent }: {
  label: string; usd?: number; children: ReactNode; accent?: 'amber' | 'emerald'
}) {
  const labelColor = accent === 'amber' ? 'text-amber-600' : accent === 'emerald' ? 'text-emerald-600' : 'text-slate-400'
  const usdColor   = accent === 'amber' ? 'text-amber-700' : accent === 'emerald' ? 'text-emerald-700' : 'text-slate-700'
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 min-w-0 overflow-hidden">
      <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide block ${labelColor}`}>{label}</span>
      {usd !== undefined && usd > 0 && (
        <span className={`text-xs sm:text-sm font-bold font-mono block mt-1 truncate ${usdColor}`}>{fmtUsd(usd)}</span>
      )}
      {children}
    </div>
  )
}

const EXPLORER_TX: Record<string, string> = {
  ethereum: 'https://etherscan.io/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  base:     'https://basescan.org/tx/',
  polygon:  'https://polygonscan.com/tx/',
}

function PositionRow({ position, chain, onAnalyze }: { position: WalletPosition; chain: string; onAnalyze: (poolId: string) => void }) {
  const feePct   = (position.feeTier / 10000).toFixed(2)
  const pair     = `${position.token0}/${position.token1}`
  const isClosed = position.status === 'closed'

  const hasUncollected = position.uncollectedFees0 > 0 || position.uncollectedFees1 > 0
  const hasCollected   = position.collectedFees0 > 0 || position.collectedFees1 > 0
  const hasFees        = hasUncollected || hasCollected

  const borderClass = isClosed
    ? 'border-slate-200'
    : position.inRange ? 'border-emerald-200' : 'border-amber-200'

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${borderClass} ${isClosed ? 'opacity-75' : ''}`}>

      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 border-b border-slate-100">
        {/* Left: pair + badges */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`font-bold text-base leading-none ${isClosed ? 'text-slate-500' : 'text-slate-900'}`}>{pair}</span>
          <span className="text-xs text-slate-400 font-mono">{feePct}%</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            position.version === 'v4' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
          }`}>
            {position.version.toUpperCase()}
          </span>
        </div>

        {/* Right: IL (open) or PnL (closed) + status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isClosed && position.ilPercent !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              position.ilPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              IL {position.ilPercent >= 0 ? '+' : ''}{position.ilPercent.toFixed(2)}%
            </span>
          )}
          {isClosed && position.pnlPercent !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              position.pnlPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              vs HODL {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
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

      {/* ─── Body ─── */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">

          {/* Range */}
          <DataCell label="Range">
            <div className="space-y-1 mt-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Min</span>
                <span className="font-mono text-xs text-slate-700">{formatPrice(position.priceLower)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Max</span>
                <span className="font-mono text-xs text-slate-700">{formatPrice(position.priceUpper)}</span>
              </div>
            </div>
          </DataCell>

          {/* Initial capital */}
          <DataCell label="Depositato" usd={position.initialValueUSD}>
            <TokenAmounts
              token0={position.token0} token1={position.token1}
              amount0={position.depositedToken0} amount1={position.depositedToken1}
            />
          </DataCell>

          {/* Current capital (open) or Withdrawn (closed) */}
          {!isClosed ? (
            <DataCell label="Attuale" usd={position.currentValueUSD}>
              <TokenAmounts
                token0={position.token0} token1={position.token1}
                amount0={position.currentAmount0} amount1={position.currentAmount1}
              />
            </DataCell>
          ) : (position.withdrawnToken0 > 0 || position.withdrawnToken1 > 0) ? (
            <DataCell label="Ritirato" usd={position.withdrawnValueUSD}>
              <TokenAmounts
                token0={position.token0} token1={position.token1}
                amount0={position.withdrawnToken0} amount1={position.withdrawnToken1}
              />
            </DataCell>
          ) : (
            <div />
          )}

          {/* PnL summary for closed positions */}
          {isClosed && position.pnlPercent !== null && (
            <div className="bg-slate-50 rounded-lg p-3 min-w-0 flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide block text-slate-400">PnL vs HODL</span>
              <span className={`text-sm font-bold font-mono block mt-1 ${
                (position.pnlVsHodlUSD ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {(position.pnlVsHodlUSD ?? 0) >= 0 ? '+' : ''}{fmtUsd(Math.abs(position.pnlVsHodlUSD ?? 0))}
              </span>
              <span className={`text-xs font-mono mt-0.5 ${
                position.pnlPercent >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
              </span>
            </div>
          )}

          {/* Fees */}
          {hasFees ? (
            <DataCell
              label={hasUncollected ? 'Fee da prelevare' : 'Fee ritirate'}
              usd={hasUncollected ? position.uncollectedFeesUSD : position.collectedFeesUSD}
              accent={hasUncollected ? 'amber' : 'emerald'}
            >
              {hasUncollected && (
                <TokenAmounts
                  token0={position.token0} token1={position.token1}
                  amount0={position.uncollectedFees0} amount1={position.uncollectedFees1}
                  color="amber"
                />
              )}
              {hasCollected && (
                <div className={hasUncollected ? 'mt-2 pt-2 border-t border-slate-200' : ''}>
                  {hasUncollected && (
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Ritirate</span>
                      {position.collectedFeesUSD > 0 && (
                        <span className="text-xs font-bold font-mono text-emerald-700">{fmtUsd(position.collectedFeesUSD)}</span>
                      )}
                    </div>
                  )}
                  <TokenAmounts
                    token0={position.token0} token1={position.token1}
                    amount0={position.collectedFees0} amount1={position.collectedFees1}
                    color="emerald"
                  />
                </div>
              )}
            </DataCell>
          ) : isClosed && position.version === 'v4' ? (
            <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide block text-slate-400">Fee</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Incluse nel PnL vs HODL</span>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="px-3 sm:px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[160px] sm:max-w-[180px]">
            {position.poolId.slice(0, 10)}…{position.poolId.slice(-4)}
          </span>
          {position.openedAt && (() => {
            const dateStr = new Date(position.openedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
            const base = EXPLORER_TX[chain]
            return position.openTxHash && base ? (
              <a href={`${base}${position.openTxHash}`} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-indigo-500 hover:text-indigo-700 underline decoration-dotted shrink-0">
                Aperta {dateStr}
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 shrink-0">Aperta {dateStr}</span>
            )
          })()}
          {position.closedAt && (() => {
            const dateStr = new Date(position.closedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
            const base = EXPLORER_TX[chain]
            return position.closeTxHash && base ? (
              <a href={`${base}${position.closeTxHash}`} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-indigo-500 hover:text-indigo-700 underline decoration-dotted shrink-0">
                · Chiusa {dateStr}
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 shrink-0">· Chiusa {dateStr}</span>
            )
          })()}
        </div>
        <button
          onClick={() => onAnalyze(position.poolId)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors shrink-0 self-end sm:self-auto"
        >
          Analizza pool <ArrowRightIcon size={12} weight="bold" />
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
  totalUncollectedFeesUSD: number
  totalCollectedFeesUSD:   number
  totalFeesUSD:            number
  positions:    WalletPosition[]
}

function SummaryBar({ totalOpen, totalClosed, inRange, outOfRange, v3Count, v4Count, totalUncollectedFeesUSD, totalCollectedFeesUSD, totalFeesUSD, positions }: SummaryBarProps) {
  // PnL calculations
  const closedPositions = positions.filter((p) => p.status === 'closed')

  // PnL vs HODL from closed positions
  const totalPnlVsHodlUSD = closedPositions.reduce((s, p) => s + (p.pnlVsHodlUSD ?? 0), 0)
  const pnlVsHodlPositive = totalPnlVsHodlUSD >= 0
  const hasV4 = positions.some((p) => p.version === 'v4')

  return (
    <div className="space-y-3">
      {/* PnL vs HODL box (closed positions only) */}
      {closedPositions.length > 0 && (
        <div className={`border rounded-xl px-4 sm:px-5 py-3 sm:py-4 ${
          pnlVsHodlPositive
            ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-emerald-200'
            : 'bg-gradient-to-r from-red-50 to-red-50/50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">PnL vs HODL · {closedPositions.length} posizioni chiuse</div>
              <div className={`text-xl sm:text-2xl font-bold font-mono mt-0.5 ${pnlVsHodlPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                {pnlVsHodlPositive ? '+' : '-'}{fmtUsd(Math.abs(totalPnlVsHodlUSD))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fees summary box */}
      {totalFeesUSD > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-amber-50 border border-emerald-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fee accumulate{hasV4 && ' (solo V3 — V4 incluse nel PnL)'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{fmtUsd(totalFeesUSD)}</div>
            </div>
            <div className="flex gap-4 sm:gap-6">
              {totalUncollectedFeesUSD > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Da prelevare</div>
                  <div className="text-base sm:text-lg font-bold font-mono text-amber-700">{fmtUsd(totalUncollectedFeesUSD)}</div>
                </div>
              )}
              {totalCollectedFeesUSD > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Ritirate</div>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-700">{fmtUsd(totalCollectedFeesUSD)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Position counts */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3 text-sm">
        <div className="bg-white border border-slate-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalOpen}</div>
          <div className="text-slate-400 text-xs">Aperte</div>
        </div>
        {totalClosed > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
            <div className="text-xl sm:text-2xl font-bold text-slate-400">{totalClosed}</div>
            <div className="text-slate-400 text-xs">Chiuse</div>
          </div>
        )}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
          <div className="text-xl sm:text-2xl font-bold text-emerald-700">{inRange}</div>
          <div className="text-slate-500 text-xs">In range</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
          <div className="text-xl sm:text-2xl font-bold text-amber-700">{outOfRange}</div>
          <div className="text-slate-500 text-xs">Out of range</div>
        </div>
        {v3Count > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
            <div className="text-xl sm:text-2xl font-bold text-sky-700">{v3Count}</div>
            <div className="text-slate-500 text-xs">V3</div>
          </div>
        )}
        {v4Count > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]">
            <div className="text-xl sm:text-2xl font-bold text-violet-700">{v4Count}</div>
            <div className="text-slate-500 text-xs">V4</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LS_KEY = 'uniswap-analyzer:wallet'

function loadSaved(): { chain: Chain; wallet: string } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.chain && parsed.wallet) return parsed
    }
  } catch { /* ignore */ }
  return { chain: 'ethereum', wallet: '' }
}

export default function MyPositions() {
  const navigate = useNavigate()
  const onSelectPool = (chain: string, address: string) => navigate(`/pool/${chain}/${address}`)

  const saved = loadSaved()
  const [chain,  setChain]  = useState<Chain>(saved.chain)
  const [wallet, setWallet] = useState(saved.wallet)
  const [query,  setQuery]  = useState(saved.wallet)

  const { data, isLoading, isError, error } = useWalletPositions(chain, query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const addr = wallet.trim()
    setQuery(addr)
    localStorage.setItem(LS_KEY, JSON.stringify({ chain, wallet: addr }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Le Mie Posizioni LP"
        description="Visualizza le tue posizioni di liquidità attive su Uniswap V3 e V4 con P&L in tempo reale, fee accumulate, impermanent loss e storico movimenti su Ethereum, Arbitrum, Base e Polygon."
      />
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Le mie posizioni</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
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
              totalUncollectedFeesUSD={data.totalUncollectedFeesUSD}
              totalCollectedFeesUSD={data.totalCollectedFeesUSD}
              totalFeesUSD={data.totalFeesUSD}
              positions={data.positions}
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
                    chain={chain}
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12 sm:pb-16 w-full">
        <div className="border-t border-slate-200 pt-8 sm:pt-12 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 text-sm text-slate-500 leading-relaxed">
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Monitora le posizioni Uniswap V3 e V4</h2>
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
