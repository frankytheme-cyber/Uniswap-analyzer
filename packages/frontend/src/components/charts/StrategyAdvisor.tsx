import type { StrategyAnalysis, Strategy } from '../../types.ts'

interface Props {
  strategyAnalysis:   StrategyAnalysis
  selectedStrategyId: string
  onSelectStrategy:   (id: string) => void
}

const REGIME_CONFIG = {
  bullish:  { label: 'Rialzista',  badge: 'bg-blue-900 text-blue-300 border-blue-700',  dot: 'bg-blue-400'  },
  bearish:  { label: 'Ribassista', badge: 'bg-red-900 text-red-300 border-red-700',     dot: 'bg-red-400'   },
  sideways: { label: 'Laterale',   badge: 'bg-green-900 text-green-300 border-green-700', dot: 'bg-green-400' },
}

const STRATEGY_COLORS: Record<string, string> = {
  'passive':        'border-gray-600 hover:border-gray-400',
  'narrow':         'border-indigo-700 hover:border-indigo-500',
  'asymmetric-up':  'border-green-700 hover:border-green-500',
  'defensive':      'border-amber-700 hover:border-amber-500',
}

const STRATEGY_SELECTED_COLORS: Record<string, string> = {
  'passive':        'border-gray-400 bg-gray-800',
  'narrow':         'border-indigo-500 bg-indigo-950',
  'asymmetric-up':  'border-green-500 bg-green-950',
  'defensive':      'border-amber-500 bg-amber-950',
}

const REBALANCING_LABEL: Record<Strategy['rebalancingFrequency'], string> = {
  'never':         'Mai',
  'monthly':       'Mensile',
  'on-10pct-move': 'Ogni ±10%',
}

const REGIME_LABEL: Record<Strategy['regime'], string> = {
  'any':      'Tutti i mercati',
  'sideways': 'Mercato laterale',
  'bullish':  'Mercato rialzista',
  'bearish':  'Mercato ribassista',
}

function formatRange(min: number, max: number): string {
  const minStr = min <= -99 ? '−∞' : `${min > 0 ? '+' : ''}${min}%`
  const maxStr = max >= 899 ? '+∞'  : `+${max}%`
  return `${minStr} / ${maxStr}`
}

export default function StrategyAdvisor({ strategyAnalysis, selectedStrategyId, onSelectStrategy }: Props) {
  const { detectedRegime, ema7, ema30, volatility30d, recommendedStrategy, allStrategies } = strategyAnalysis
  const regimeCfg = REGIME_CONFIG[detectedRegime]

  return (
    <div className="space-y-5">
      {/* Header regime */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Regime di Mercato Rilevato</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${regimeCfg.badge}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${regimeCfg.dot}`} />
              {regimeCfg.label}
            </span>
            <span className="text-xs text-gray-500">
              EMA7 <span className="text-gray-300 font-mono">{ema7.toFixed(4)}</span>
              {' '}·{' '}
              EMA30 <span className="text-gray-300 font-mono">{ema30.toFixed(4)}</span>
            </span>
            <span className="text-xs text-gray-500">
              Volatilità ann. <span className="text-amber-400 font-medium">{volatility30d.toFixed(1)}%</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Strategia raccomandata</p>
          <p className="text-sm font-semibold text-white mt-0.5">{recommendedStrategy.name}</p>
        </div>
      </div>

      {/* Card strategie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allStrategies.map((strategy) => {
          const isSelected    = strategy.id === selectedStrategyId
          const isRecommended = strategy.id === recommendedStrategy.id

          return (
            <button
              key={strategy.id}
              onClick={() => onSelectStrategy(strategy.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? STRATEGY_SELECTED_COLORS[strategy.id]
                  : `border-gray-800 bg-gray-900 ${STRATEGY_COLORS[strategy.id]}`
              }`}
            >
              {/* Intestazione card */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{strategy.name}</span>
                    {isRecommended && (
                      <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                        consigliata
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    {REGIME_LABEL[strategy.regime]}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-400 whitespace-nowrap ml-2">
                  {formatRange(strategy.rangeMinPercent, strategy.rangeMaxPercent)}
                </span>
              </div>

              {/* Descrizione */}
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">{strategy.description}</p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  Riposizionamento: <span className="text-gray-400">{REBALANCING_LABEL[strategy.rebalancingFrequency]}</span>
                </span>
              </div>

              {/* Rischi */}
              {isSelected && strategy.risks.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-gray-700 pt-3">
                  {strategy.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
