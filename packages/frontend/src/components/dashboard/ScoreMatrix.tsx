import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import type { ParameterScore } from '../../types.ts'

interface Props {
  parameters: ParameterScore[]
  version?: 'v3' | 'v4'
}

// Dati API usati per il calcolo di ogni parametro
const PARAM_DATA_SOURCE: Record<string, string> = {
  tvl:         'The Graph — pool.tick · ticks[].liquidityGross · pool.totalValueLockedUSD',
  volume:      'The Graph — swaps[500].amountUSD / sender · poolDayDatas[1].volumeUSD',
  fees:        'The Graph — poolDayDatas[365].feesUSD · tvlUSD (annualizzato)',
  competitive: 'The Graph — pool top stesso feeTier: feesUSD · totalValueLockedUSD',
  efficiency:  'The Graph — poolHourDatas[168h].tick (7 giorni orari)',
  incentives:  'The Graph — poolDayDatas[90].tvlUSD · feesUSD (Pearson r + spike)',
}

const STATUS_COLOR: Record<string, string> = {
  good: '#22c55e',
  warn: '#f59e0b',
  bad:  '#ef4444',
}

const STATUS_BG: Record<string, string> = {
  good: 'bg-green-900/30 border-green-700',
  warn: 'bg-amber-900/30 border-amber-700',
  bad:  'bg-red-900/30 border-red-700',
}

const STATUS_DOT: Record<string, string> = {
  good: 'bg-green-500',
  warn: 'bg-amber-500',
  bad:  'bg-red-500',
}

export default function ScoreMatrix({ parameters, version }: Props) {
  const radarData = parameters.map((p) => ({
    label: p.label,
    value: p.score === 1 ? 100 : p.status === 'warn' ? 50 : 10,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar chart */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-gray-400">Score Radar</h3>
          {version && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              version === 'v4'
                ? 'bg-violet-900 text-violet-300'
                : 'bg-gray-700 text-gray-300'
            }`}>
              Uniswap {version === 'v4' ? 'V4' : 'V3'}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <Radar
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Parameter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {parameters.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-3 ${STATUS_BG[p.status]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-300">{p.label}</span>
              <div className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`} />
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: STATUS_COLOR[p.status] }}
            >
              {p.displayValue}
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-tight">{p.detail}</p>
            {p.rawData && Object.keys(p.rawData).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {Object.entries(p.rawData).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-gray-500 text-[10px] truncate">{k}</dt>
                      <dd className="text-gray-400 text-[10px] font-mono text-right truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {PARAM_DATA_SOURCE[p.id] && (
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">API </span>
                <span className="text-[10px] text-gray-400 font-mono leading-snug">
                  {PARAM_DATA_SOURCE[p.id]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
