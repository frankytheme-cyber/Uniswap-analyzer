import type { PoolAnalysis } from '../../types.ts'

interface Props {
  analysis:  PoolAnalysis
  onClick:   () => void
  onRefresh: () => void
  loading:   boolean
}

const STATUS_BADGE: Record<string, string> = {
  healthy: 'bg-green-900 text-green-300 border-green-700',
  caution: 'bg-amber-900 text-amber-300 border-amber-700',
  risk:    'bg-red-900 text-red-300 border-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Sana',
  caution: 'Attenzione',
  risk:    'Rischio',
}

const STATUS_RING: Record<string, string> = {
  healthy: 'ring-green-500',
  caution: 'ring-amber-500',
  risk:    'ring-red-500',
}

const PARAM_SHORT: Record<string, string> = {
  tvl:         'TVL',
  volume:      'Vol',
  fees:        'Fee',
  competitive: 'Comp',
  efficiency:  'Eff',
  incentives:  'Inc',
}

const CHAIN_LABEL: Record<string, string> = {
  ethereum: 'ETH',
  arbitrum: 'ARB',
  base:     'BASE',
  polygon:  'POL',
}

export default function PoolCard({ analysis, onClick, onRefresh, loading }: Props) {
  const { token0, token1, feeTier, overallScore, overallStatus, chain } = analysis

  const scoreColor =
    overallScore >= 80 ? 'text-green-400' :
    overallScore >= 50 ? 'text-amber-400' :
    'text-red-400'

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">
              {token0}/{token1}
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
              {(feeTier / 10000).toFixed(2)}%
            </span>
            <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded">
              {CHAIN_LABEL[chain] ?? chain}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">
            {analysis.poolAddress.slice(0, 10)}…
          </div>
        </div>

        {/* Score circle */}
        <div
          title={`Score: ${overallScore}/100 — ${analysis.parameters.filter(p => p.score === 1).length}/6 parametri positivi`}
          className={`w-12 h-12 rounded-full ring-2 ${STATUS_RING[overallStatus]} flex items-center justify-center flex-shrink-0 cursor-help`}
        >
          <span className={`text-sm font-bold ${scoreColor}`}>{overallScore}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_BADGE[overallStatus]}`}>
          {STATUS_LABEL[overallStatus]}
        </span>

        <button
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          disabled={loading}
          onClick={(e) => { e.stopPropagation(); onRefresh() }}
        >
          {loading ? 'Aggiornamento…' : 'Aggiorna'}
        </button>
      </div>

      {/* Parameter indicators */}
      <div className="flex gap-1.5 mt-3">
        {analysis.parameters.map((p) => (
          <div
            key={p.id}
            title={p.detail}
            className={`flex-1 rounded px-0.5 py-1 flex flex-col items-center gap-1 cursor-help ${
              p.score === 1 ? 'bg-green-950 border border-green-800' : 'bg-red-950 border border-red-900'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${p.score === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-[9px] leading-tight text-center font-medium ${
              p.score === 1 ? 'text-green-400' : 'text-red-400'
            }`}>
              {PARAM_SHORT[p.id] ?? p.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
