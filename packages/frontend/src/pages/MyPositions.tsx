import { useState, type ReactNode } from 'react'
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWalletPositions, useLidoPosition, useAavePosition } from '../hooks/usePoolData.ts'
import type { WalletPosition } from '../types.ts'
import type { Chain } from '../types.ts'
import Footer   from '../components/Footer.tsx'
import SEO      from '../components/SEO.tsx'
import LidoCard from '../components/dashboard/LidoCard.tsx'
import AaveCard from '../components/dashboard/AaveCard.tsx'

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
    <div className="rounded-lg p-2.5 sm:p-3 min-w-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-raised)' }}>
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
    <div className={`rounded-xl border overflow-hidden ${borderClass} ${isClosed ? 'opacity-60' : 'shadow-md ring-1 ring-black/[0.04]'}`} style={{ backgroundColor: 'var(--bg-surface)' }}>

      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`font-bold leading-none ${isClosed ? 'text-base text-slate-500' : 'text-lg text-slate-900'}`}>{pair}</span>
          <span className="text-xs text-slate-400 font-mono">{feePct}%</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            position.version === 'v4' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
          }`}>
            {position.version.toUpperCase()}
          </span>
        </div>

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

          <DataCell label="Depositato" usd={position.initialValueUSD}>
            <TokenAmounts
              token0={position.token0} token1={position.token1}
              amount0={position.depositedToken0} amount1={position.depositedToken1}
            />
          </DataCell>

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

          {isClosed && position.pnlPercent !== null && (
            <div className="rounded-lg p-3 min-w-0 flex flex-col justify-center" style={{ backgroundColor: 'var(--bg-raised)' }}>
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
      <div className="px-3 sm:px-4 py-2.5 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-raised)' }}>
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
  const closedPositions    = positions.filter((p) => p.status === 'closed')
  const totalPnlVsHodlUSD  = closedPositions.reduce((s, p) => s + (p.pnlVsHodlUSD ?? 0), 0)
  const pnlVsHodlPositive  = totalPnlVsHodlUSD >= 0
  const hasV4              = positions.some((p) => p.version === 'v4')

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3 text-sm">
        <div className="border rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalOpen}</div>
          <div className="text-slate-400 text-xs">Aperte</div>
        </div>
        {totalClosed > 0 && (
          <div className="border rounded-lg px-2 sm:px-3 py-2 text-center sm:min-w-[72px]" style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)' }}>
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
  const [chain,   setChain]   = useState<Chain>(saved.chain)
  const [wallet,  setWallet]  = useState(saved.wallet)
  const [query,   setQuery]   = useState(saved.wallet)
  // Privacy mode: nasconde (blur) gli importi quando è caricato un wallet.
  // Default ON non appena c'è un wallet, così i numeri sono nascosti "out of the box".
  const [privacy, setPrivacy] = useState(Boolean(saved.wallet))

  const { data, isLoading, isError, error } = useWalletPositions(chain, query)
  const { data: lidoData, isLoading: lidoLoading } = useLidoPosition(query)
  const { data: aaveData, isLoading: aaveLoading } = useAavePosition(query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const addr = wallet.trim()
    setQuery(addr)
    // Appena inserisci un wallet i numeri partono nascosti.
    if (addr) setPrivacy(true)
    localStorage.setItem(LS_KEY, JSON.stringify({ chain, wallet: addr }))
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      <SEO
        title="Il Mio Portafoglio DeFi"
        description="Visualizza in un'unica vista le tue posizioni LP su Uniswap V3/V4 e i fondi in staking su Lido. Fee accumulate, impermanent loss, rewards stETH e P&L in tempo reale — sola lettura, nessuna connessione richiesta."
      />

      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col gap-6 sm:gap-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Il mio portafoglio DeFi</h1>
            <p className="text-slate-500 text-sm mt-1 max-w-xl">
              Posizioni LP Uniswap V3/V4 e staking Lido in un'unica vista — sola lettura, nessuna connessione richiesta.
            </p>
          </div>
          {/* Protocol badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              Uniswap V3/V4
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-200">
              Lido stETH
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
              Aave V3
            </span>
          </div>
        </div>

        {/* ── Search form ─────────────────────────────────────────────────── */}
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

          <div className="flex-1 min-w-0 relative">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x... indirizzo wallet Ethereum"
              className={`w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-[filter] ${
                privacy && wallet ? 'blur-[6px] select-none' : ''
              }`}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setPrivacy((p) => !p)}
              title={privacy ? 'Mostra indirizzo wallet' : 'Nascondi indirizzo wallet'}
              aria-label={privacy ? 'Mostra indirizzo wallet' : 'Nascondi indirizzo wallet'}
              className="absolute inset-y-0 right-0 px-2.5 text-slate-400 hover:text-slate-700 transition-colors flex items-center"
            >
              {privacy ? <EyeSlashIcon size={18} weight="regular" /> : <EyeIcon size={18} weight="regular" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!/^0x[0-9a-fA-F]{40}$/.test(wallet.trim())}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Cerca
          </button>
        </form>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Errore nel caricamento delle posizioni.'}
          </div>
        )}

        {/* ── Two-column layout ────────────────────────────────────────────
            DOM order: Lido first (→ mobile top), Uniswap second.
            On lg: Lido → col 2 sticky, Uniswap → col 1
        ────────────────────────────────────────────────────────────────── */}
        {query && (
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] lg:items-start gap-6">

            {/* ── RIGHT: Lido + Aave (first in DOM = mobile top) ─────────── */}
            <div className="lg:col-start-2 lg:row-start-1 space-y-6">

              {/* Lido */}
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                  Lido Staking
                </h2>

                {lidoLoading ? (
                  <div className="rounded-xl border border-teal-100 p-5 animate-pulse space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <div className="h-4 rounded w-2/5 bg-teal-100" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-10 rounded bg-teal-50" />
                      <div className="h-10 rounded bg-teal-50" />
                    </div>
                    <div className="h-24 rounded bg-teal-50" />
                  </div>
                ) : lidoData ? (
                  <LidoCard position={lidoData} privacy={privacy} />
                ) : (
                  <div className="rounded-xl border border-teal-200 px-4 py-5 text-sm text-slate-400" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    Nessuna posizione Lido su questo wallet.
                  </div>
                )}
              </div>

              {/* Aave */}
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Aave V3
                </h2>

                {aaveLoading ? (
                  <div className="rounded-xl border border-violet-100 p-5 animate-pulse space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <div className="h-4 rounded w-2/5 bg-violet-100" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-10 rounded bg-violet-50" />
                      <div className="h-10 rounded bg-violet-50" />
                    </div>
                    <div className="h-24 rounded bg-violet-50" />
                  </div>
                ) : aaveData ? (
                  <AaveCard position={aaveData} privacy={privacy} />
                ) : (
                  <div className="rounded-xl border border-violet-200 px-4 py-5 text-sm text-slate-400" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    Nessuna posizione Aave V3 su questo wallet.
                  </div>
                )}
              </div>

            </div>

            {/* ── LEFT: Uniswap positions (second in DOM = mobile bottom) ── */}
            <div className="lg:col-start-1 lg:row-start-1">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                Uniswap Liquidity
              </h2>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4 animate-pulse space-y-2" style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <div className="h-4 rounded w-1/3 bg-slate-100" />
                      <div className="h-3 rounded w-1/4 bg-slate-50" />
                    </div>
                  ))}
                </div>
              ) : data ? (
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
                  ) : (() => {
                    const open   = data.positions.filter((p) => p.status !== 'closed')
                    const closed = data.positions.filter((p) => p.status === 'closed')
                    return (
                      <div className="space-y-6">
                        {open.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                              Posizioni attive · {open.length}
                            </h3>
                            {open.map((p) => (
                              <PositionRow key={p.id} position={p} chain={chain} onAnalyze={(poolId) => onSelectPool(chain, poolId)} />
                            ))}
                          </div>
                        )}
                        {closed.length > 0 && (
                          <details className="group rounded-xl border border-slate-100" style={{ backgroundColor: 'var(--bg-surface)' }}>
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 select-none">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Posizioni chiuse · {closed.length}
                              </h3>
                              <svg
                                className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                              </svg>
                            </summary>
                            <div className="space-y-3 px-4 pb-4 pt-1">
                              {closed.map((p) => (
                                <PositionRow key={p.id} position={p} chain={chain} onAnalyze={(poolId) => onSelectPool(chain, poolId)} />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  })()}

                  <p className="text-xs text-slate-400">
                    Dati da The Graph + on-chain · aggiornati al {new Date(data.lastUpdated).toLocaleTimeString('it-IT')}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 px-4 py-10 text-center text-slate-400 text-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  Inserisci un indirizzo wallet per vedere le posizioni.
                </div>
              )}
            </div>

          </div>
        )}

        {/* Empty state before any search */}
        {!query && (
          <div className="rounded-xl border border-slate-100 px-6 py-16 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Inserisci un indirizzo wallet Ethereum per visualizzare le posizioni LP su Uniswap e i fondi in staking su Lido.
            </p>
          </div>
        )}

      </div>

      {/* ── SEO content ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-12 sm:pb-16 w-full">
        <div className="border-t border-slate-200 pt-8 sm:pt-12 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 text-sm text-slate-500 leading-relaxed">
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Portafoglio DeFi in un'unica vista</h2>
            <p className="mb-3">
              Visualizza in parallelo le posizioni LP su <strong className="text-slate-600">Uniswap V3 e V4</strong> e i fondi
              in staking su <strong className="text-slate-600">Lido</strong> senza connettere il portafoglio.
              Inserisci un indirizzo Ethereum per vedere fee maturate, impermanent loss e reward stETH aggiornati in tempo reale.
            </p>
            <p>
              La colonna sinistra mostra le posizioni LP con range, capitale depositato, fee da prelevare e P&amp;L vs HODL.
              La colonna destra mostra il balance stETH/wstETH, l'APR corrente e lo storico reward giornaliero degli ultimi 30 giorni.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Come vengono calcolate le fee Uniswap</h2>
            <p className="mb-3">
              Le fee da prelevare vengono calcolate on-chain tramite la formula <code className="text-xs bg-slate-100 px-1 rounded">feeGrowthInside</code> del
              whitepaper Uniswap — non dal subgraph — garantendo dati accurati anche per posizioni V4 sul nuovo PoolManager.
            </p>
            <p>
              Le fee ritirate provengono dallo storico The Graph e includono tutti i <code className="text-xs bg-slate-100 px-1 rounded">collect()</code> eseguiti dal wallet nel tempo.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Reward Lido e storico giornaliero</h2>
            <p className="mb-3">
              I dati Lido provengono direttamente dall'API ufficiale di <strong className="text-slate-600">stake.lido.fi</strong>.
              Ogni riga della tabella reward mostra il cambio in stETH, il valore in dollari al prezzo storico di quel giorno, l'APR
              e il balance cumulativo — identico a quanto visibile sul sito Lido.
            </p>
            <p>
              Il balance stETH viene letto on-chain via JSON-RPC. Il wstETH viene convertito in ETH equivalente usando
              il tasso <code className="text-xs bg-slate-100 px-1 rounded">stEthPerToken()</code> del contratto wstETH.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Chain e versioni supportate</h2>
            <ul className="space-y-1.5">
              {[
                ['Uniswap V3', 'posizioni lette dal subgraph, fee calcolate on-chain via NonfungiblePositionManager'],
                ['Uniswap V4', 'posizioni ricostruite da eventi ModifyLiquidity, fee via PoolManager extsload'],
                ['Lido stETH', 'balance on-chain Ethereum mainnet, reward da stake.lido.fi API'],
                ['Ethereum', 'mainnet — supporta Uniswap V3/V4 + Lido'],
                ['Arbitrum / Base / Polygon', 'Uniswap V3/V4 (Lido su Ethereum mainnet)'],
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
