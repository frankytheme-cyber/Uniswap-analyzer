import type { WalletTokensResponse } from '../../types.ts'

interface Props {
  data:    WalletTokensResponse
  privacy?: boolean
}

function fmtBalance(n: number, decimals = 4): string {
  if (n === 0) return '0'
  if (n < 0.0001) return n.toExponential(2)
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function fmtUsd(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.01) return '<$0.01'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPrice(n: number): string {
  if (n === 0) return '—'
  if (n < 0.0001) return '<$0.0001'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** Single-letter avatar for a token symbol */
function TokenAvatar({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    ETH:   'bg-indigo-100 text-indigo-700',
    WETH:  'bg-indigo-100 text-indigo-700',
    USDC:  'bg-blue-100 text-blue-700',
    USDT:  'bg-emerald-100 text-emerald-700',
    DAI:   'bg-yellow-100 text-yellow-700',
    WBTC:  'bg-orange-100 text-orange-700',
    ARB:   'bg-sky-100 text-sky-700',
    UNI:   'bg-pink-100 text-pink-700',
    LINK:  'bg-blue-100 text-blue-700',
    POL:   'bg-purple-100 text-purple-700',
    WMATIC:'bg-purple-100 text-purple-700',
    cbETH: 'bg-blue-100 text-blue-700',
  }
  const cls = colors[symbol] ?? 'bg-slate-100 text-slate-600'
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${cls}`}>
      {symbol.slice(0, 2)}
    </div>
  )
}

export default function WalletTokensCard({ data, privacy = false }: Props) {
  const { tokens, totalUSD } = data
  const blurClass = privacy ? 'blur-[5px] select-none' : ''

  if (tokens.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 px-4 py-5 text-sm text-slate-400" style={{ backgroundColor: 'var(--bg-surface)' }}>
        Nessun token trovato su questo wallet.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ backgroundColor: 'var(--bg-raised)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold leading-none">W</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">Token nel wallet</span>
        </div>
        <span className={`text-base font-bold font-mono text-slate-900 ${blurClass}`}>
          {fmtUsd(totalUSD)}
        </span>
      </div>

      {/* ── Token list ─────────────────────────────────────────────────────── */}
      <div className="divide-y divide-slate-100">
        {tokens.map((token) => (
          <div key={token.address} className="flex items-center gap-3 px-4 py-2.5">
            <TokenAvatar symbol={token.symbol} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">{token.symbol}</span>
                {token.address === 'native' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">nativo</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{token.name}</div>
            </div>

            <div className="text-right shrink-0">
              <div className={`text-sm font-mono font-medium text-slate-800 ${blurClass}`}>
                {fmtBalance(token.balance)} {token.symbol}
              </div>
              <div className={`text-xs font-mono ${token.balanceUSD > 0 ? 'text-slate-500' : 'text-slate-300'} ${blurClass}`}>
                {token.balanceUSD > 0 ? fmtUsd(token.balanceUSD) : (
                  <span className="text-slate-300 text-[10px]">{fmtPrice(token.priceUSD)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-raised)' }}>
        <span className="text-[11px] text-slate-400">
          {tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-slate-400">
          Prezzi via DeFiLlama
        </span>
      </div>

    </div>
  )
}
