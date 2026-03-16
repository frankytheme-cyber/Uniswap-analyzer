import type { PoolAnalysis } from '../../types.ts'
import CopyAddress from '../CopyAddress.tsx'

interface Props {
  analysis:  PoolAnalysis
  onClick:   () => void
  onRefresh: () => void
  loading:   boolean
}

const STATUS_BADGE: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  caution: 'bg-amber-50 text-amber-700 border-amber-200',
  risk:    'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Sana',
  caution: 'Attenzione',
  risk:    'Rischio',
}

const STATUS_RING: Record<string, string> = {
  healthy: 'ring-emerald-300 text-emerald-600',
  caution: 'ring-amber-300 text-amber-600',
  risk:    'ring-red-300 text-red-600',
}

const PARAM_SHORT: Record<string, string> = {
  tvl:         'TVL',
  volume:      'Vol',
  fees:        'Fee',
  competitive: 'Comp',
  efficiency:  'Eff',
  incentives:  'Inc',
  maturity:    'Mat',
}

const CHAIN_LABEL: Record<string, string> = {
  ethereum: 'ETH',
  arbitrum: 'ARB',
  base:     'BASE',
  polygon:  'POL',
}

export default function PoolCard({ analysis, onClick, onRefresh, loading }: Props) {
  const { token0, token1, feeTier, overallScore, overallStatus, chain } = analysis
  const ringClass = STATUS_RING[overallStatus] ?? 'ring-slate-300 text-slate-600'

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 hover:shadow-card-hover transition-all shadow-card"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 text-base">
              {token0}/{token1}
            </span>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {(feeTier / 10000).toFixed(2)}%
            </span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
              {CHAIN_LABEL[chain] ?? chain}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${
              analysis.version === 'v4'
                ? 'bg-violet-50 text-violet-600 border-violet-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {analysis.version === 'v4' ? 'V4' : 'V3'}
            </span>
          </div>
          <CopyAddress address={analysis.poolAddress} prefixLen={10} suffixLen={6} className="text-xs mt-0.5" />
        </div>

        {/* Score circle */}
        <div
          title={`Score: ${overallScore}/100 — ${analysis.parameters.filter(p => p.score === 1).length}/${analysis.parameters.length} parametri positivi`}
          className={`w-11 h-11 rounded-full ring-2 ${ringClass} bg-white flex items-center justify-center flex-shrink-0 cursor-help`}
        >
          <span className="text-sm font-bold">{overallScore}</span>
        </div>
      </div>

      {/* Status badge + refresh */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_BADGE[overallStatus]}`}>
          {STATUS_LABEL[overallStatus]}
        </span>
        <button
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          disabled={loading}
          onClick={(e) => { e.stopPropagation(); onRefresh() }}
        >
          {loading ? 'Aggiornamento…' : 'Aggiorna'}
        </button>
      </div>

      {/* Parameter indicators */}
      <div className="flex gap-1">
        {analysis.parameters.map((p) => (
          <div
            key={p.id}
            title={p.detail}
            className={`flex-1 rounded px-0.5 py-1.5 flex flex-col items-center gap-1 cursor-help border ${
              p.score === 1
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${p.score === 1 ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <span className={`text-[9px] leading-tight text-center font-medium ${
              p.score === 1 ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {PARAM_SHORT[p.id] ?? p.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
