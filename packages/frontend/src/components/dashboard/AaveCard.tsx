import { useState } from 'react'
import type { AavePosition, AaveSuppliedAsset, AaveBorrowedAsset } from '../../types.ts'
import CopyAddress from '../CopyAddress.tsx'

interface Props {
  position: AavePosition
  privacy?: boolean
}

function fmtUsd(n: number): string {
  if (n === 0) return '$0'
  if (Math.abs(n) < 0.01) return '<$0.01'
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtToken(n: number, symbol: string): string {
  if (n === 0) return `0 ${symbol}`
  const decimals = n < 0.001 ? 6 : n < 1 ? 4 : 2
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }) + ' ' + symbol
}

function fmtApy(n: number): string {
  return n.toFixed(2) + '%'
}

function HealthBar({ hf }: { hf: number }) {
  // hf = 0 means no borrows
  if (hf === 0) return <span className="font-bold text-slate-500 text-sm">—</span>

  const color =
    hf >= 2   ? 'text-emerald-600' :
    hf >= 1.5 ? 'text-amber-500'   :
    hf >= 1.1 ? 'text-orange-500'  :
                'text-red-600'

  return (
    <span className={`font-bold text-sm font-mono ${color}`}>
      {hf.toFixed(2)}
    </span>
  )
}

const ROWS_DEFAULT = 5

function SuppliedTable({ assets }: { assets: AaveSuppliedAsset[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? assets : assets.slice(0, ROWS_DEFAULT)

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700 mb-2">Supplied</div>

      <div className="grid grid-cols-[1fr_80px_60px_20px] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
        <span>Asset</span>
        <span className="text-right">Value</span>
        <span className="text-right">APY</span>
        <span />
      </div>

      <div className="divide-y divide-slate-50">
        {visible.map((a) => (
          <div
            key={a.symbol}
            className="grid grid-cols-[1fr_80px_60px_20px] gap-x-2 px-2 py-2 text-xs hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-700">{a.symbol}</span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono">
                {fmtToken(a.balance, '')}
              </span>
            </div>
            <span className="text-right font-mono text-slate-600">{fmtUsd(a.balanceUSD)}</span>
            <span className="text-right text-emerald-600 font-semibold">{fmtApy(a.apy)}</span>
            <span className="text-center text-[10px]">
              {a.isCollateral ? (
                <span title="Used as collateral" className="text-violet-500">●</span>
              ) : (
                <span title="Not collateral" className="text-slate-300">○</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {assets.length > ROWS_DEFAULT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full mt-1 py-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors border-t border-slate-100"
        >
          {showAll ? 'Mostra meno ↑' : `Mostra tutti i ${assets.length} asset ↓`}
        </button>
      )}
    </div>
  )
}

function BorrowedTable({ assets }: { assets: AaveBorrowedAsset[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-700 mb-2">Borrowed</div>

      <div className="grid grid-cols-[1fr_80px_60px_48px] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
        <span>Asset</span>
        <span className="text-right">Value</span>
        <span className="text-right">APY</span>
        <span className="text-right">Rate</span>
      </div>

      <div className="divide-y divide-slate-50">
        {assets.map((a, i) => (
          <div
            key={`${a.symbol}-${i}`}
            className="grid grid-cols-[1fr_80px_60px_48px] gap-x-2 px-2 py-2 text-xs hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-700">{a.symbol}</span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono">
                {fmtToken(a.amount, '')}
              </span>
            </div>
            <span className="text-right font-mono text-red-500">{fmtUsd(a.amountUSD)}</span>
            <span className="text-right text-red-500 font-semibold">{fmtApy(a.apy)}</span>
            <span className="text-right text-slate-400 text-[10px] uppercase font-medium">
              {a.rateMode === 'variable' ? 'Var' : 'Stbl'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AaveCard({ position, privacy = false }: Props) {
  const {
    walletAddress,
    totalSuppliedUSD,
    totalBorrowedUSD,
    netWorthUSD,
    healthFactor,
    netAPY,
    supplied,
    borrowed,
  } = position

  const hasPosition = totalSuppliedUSD > 0 || totalBorrowedUSD > 0

  return (
    <div className="rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 bg-violet-50/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold leading-none">Aa</span>
          </div>
          <span className="font-semibold text-violet-900 text-sm">Aave V3</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">
            ETH
          </span>
        </div>
        <CopyAddress address={walletAddress} prefixLen={10} suffixLen={6} className={`text-xs text-slate-400 ${privacy ? 'blur-[6px] select-none' : ''}`} />
      </div>

      <div className="px-4 py-4 space-y-5">
        {!hasPosition ? (
          <p className="text-sm text-slate-400 py-2">Nessuna posizione Aave V3 su questo wallet.</p>
        ) : (
          <>
            {/* ── Summary ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-400 mb-1">Supplied</div>
                <div className="font-bold text-slate-800 text-sm font-mono leading-tight">
                  {fmtUsd(totalSuppliedUSD)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Borrowed</div>
                {totalBorrowedUSD > 0 ? (
                  <div className="font-bold text-red-500 text-sm font-mono leading-tight">
                    {fmtUsd(totalBorrowedUSD)}
                  </div>
                ) : (
                  <div className="text-xs text-slate-300 mt-1">—</div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Net worth</div>
                <div className={`font-bold text-sm font-mono leading-tight ${netWorthUSD >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {fmtUsd(netWorthUSD)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {totalBorrowedUSD > 0 ? 'Health factor' : 'Net APY'}
                </div>
                {totalBorrowedUSD > 0 ? (
                  <HealthBar hf={healthFactor} />
                ) : (
                  <div className="font-bold text-emerald-600 text-sm leading-tight">
                    {fmtApy(netAPY)}
                  </div>
                )}
              </div>
            </div>

            {/* Net APY also shown when there are borrows */}
            {totalBorrowedUSD > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500 -mt-3 mb-1">
                <span>Net APY</span>
                <span className={`font-semibold ${netAPY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {netAPY >= 0 ? '+' : ''}{fmtApy(netAPY)}
                </span>
              </div>
            )}

            {/* ── Supplied assets ───────────────────────────────────────────── */}
            {supplied.length > 0 && <SuppliedTable assets={supplied} />}

            {/* ── Borrowed assets ───────────────────────────────────────────── */}
            {borrowed.length > 0 && <BorrowedTable assets={borrowed} />}
          </>
        )}
      </div>
    </div>
  )
}
