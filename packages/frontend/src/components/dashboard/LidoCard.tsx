import { useState } from 'react'
import type { LidoPosition } from '../../types.ts'
import CopyAddress from '../CopyAddress.tsx'

interface Props {
  position: LidoPosition
  privacy?: boolean
}

function fmtStEth(n: number, decimals = 8): string {
  if (n === 0) return '0'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtUsd(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.0001) return '<$0.0001'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(timeUnix: number): string {
  return new Date(timeUnix * 1000).toLocaleDateString('it-IT', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

const ROWS_DEFAULT = 7

export default function LidoCard({ position, privacy = false }: Props) {
  const [showAll, setShowAll] = useState(false)

  const {
    walletAddress,
    stEthBalance,
    wstEthBalance,
    wstEthInEth,
    totalEthValue,
    apr,
    averageApr,
    totalRewards30dEth,
    totalRewards30dUSD,
    rewards30d,
    stEthPriceUsd,
  } = position

  const hasPosition = totalEthValue > 0
  const visibleRows  = showAll ? rewards30d : rewards30d.slice(0, ROWS_DEFAULT)

  return (
    <div className="rounded-xl border border-teal-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100 bg-teal-50/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold leading-none">Li</span>
          </div>
          <span className="font-semibold text-teal-900 text-sm">Lido stETH</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200 uppercase tracking-wide">
            ETH
          </span>
        </div>
        <CopyAddress address={walletAddress} prefixLen={10} suffixLen={6} className={`text-xs text-slate-400 ${privacy ? 'blur-[6px] select-none' : ''}`} />
      </div>

      <div className="px-4 py-4 space-y-5">
        {!hasPosition ? (
          <p className="text-sm text-slate-400 py-2">Nessuna posizione Lido su questo wallet.</p>
        ) : (
          <>
            {/* ── Summary (4 metriche, layout Lido) ────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-400 mb-1">stETH balance</div>
                <div className="font-bold text-slate-800 text-sm font-mono leading-tight">
                  {fmtStEth(stEthBalance)} stETH
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{fmtUsd(stEthBalance * stEthPriceUsd)}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">
                  stETH rewarded <span className="text-[10px]">(30gg)</span>
                </div>
                {totalRewards30dEth > 0 ? (
                  <>
                    <div className="font-bold text-emerald-600 text-sm font-mono leading-tight">
                      {fmtStEth(totalRewards30dEth)} stETH
                    </div>
                    <div className="text-xs text-emerald-500 mt-0.5">{fmtUsd(totalRewards30dUSD)}</div>
                  </>
                ) : (
                  <div className="text-xs text-slate-300 mt-1">—</div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Average APR *</div>
                <div className="font-bold text-slate-800 text-sm leading-tight">
                  {(averageApr || apr).toFixed(1)} %
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">stETH price</div>
                <div className="font-bold text-slate-800 text-sm font-mono leading-tight">
                  {fmtUsd(stEthPriceUsd)}
                </div>
                {wstEthBalance > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    wstETH: {wstEthBalance.toFixed(6)} ≈ {wstEthInEth.toFixed(6)} ETH
                  </div>
                )}
              </div>
            </div>

            {/* ── Reward history table ──────────────────────────────────────── */}
            {rewards30d.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">Reward history</div>

                {/* Table header */}
                <div className="grid grid-cols-[90px_1fr_80px_44px_1fr] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <span>Date</span>
                  <span className="text-right">Change</span>
                  <span className="text-right">$ Change</span>
                  <span className="text-right">APR</span>
                  <span className="text-right">Balance</span>
                </div>

                <div className="divide-y divide-slate-50">
                  {visibleRows.map((row) => (
                    <div
                      key={row.timeUnix}
                      className="grid grid-cols-[90px_1fr_80px_44px_1fr] gap-x-2 px-2 py-2 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-500">{fmtDate(row.timeUnix)}</span>
                      <span className="text-right font-mono text-emerald-600">
                        +{fmtStEth(row.rewardsEth)}
                      </span>
                      <span className="text-right font-mono text-emerald-600">
                        {fmtUsd(row.rewardsUsd)}
                      </span>
                      <span className="text-right text-slate-500">
                        {row.apr.toFixed(1)}
                      </span>
                      <span className="text-right font-mono text-slate-600">
                        {fmtStEth(row.balanceEth)}
                      </span>
                    </div>
                  ))}
                </div>

                {rewards30d.length > ROWS_DEFAULT && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full mt-1 py-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors border-t border-slate-100"
                  >
                    {showAll
                      ? 'Mostra meno ↑'
                      : `Mostra tutti i ${rewards30d.length} giorni ↓`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
