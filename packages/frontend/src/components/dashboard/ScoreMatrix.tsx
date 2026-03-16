import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import type { ParameterScore } from '../../types.ts'

interface Props {
  parameters: ParameterScore[]
  version?: 'v3' | 'v4'
}

const PARAM_DATA_SOURCE: Record<string, string> = {
  tvl:         'The Graph — pool.tick · ticks[].liquidityGross · pool.totalValueLockedUSD',
  volume:      'The Graph — swaps[500].amountUSD / sender · poolDayDatas[1].volumeUSD',
  fees:        'The Graph — poolDayDatas[365].feesUSD · tvlUSD (annualizzato)',
  competitive: 'The Graph — pool top stesso feeTier: feesUSD · totalValueLockedUSD',
  efficiency:  'The Graph — poolHourDatas[168h].tick (7 giorni orari)',
  incentives:  'The Graph — poolDayDatas[90].tvlUSD · feesUSD (Pearson r + spike)',
  maturity:    'Subgraph — createdAtTimestamp + poolDayDatas CV(feeAPR, volume, TVL)',
}

const STATUS_COLOR: Record<string, string> = {
  good: '#10b981',   // emerald-500
  warn: '#f59e0b',   // amber-500
  bad:  '#ef4444',   // red-500
}

const STATUS_BG: Record<string, string> = {
  good: 'bg-emerald-50 border-emerald-200',
  warn: 'bg-amber-50 border-amber-200',
  bad:  'bg-red-50 border-red-200',
}

const STATUS_DOT: Record<string, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad:  'bg-red-400',
}

const STATUS_VALUE_COLOR: Record<string, string> = {
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad:  'text-red-600',
}

export default function ScoreMatrix({ parameters, version }: Props) {
  const radarData = parameters.map((p) => ({
    label: p.label,
    value: p.score === 1 ? 100 : p.status === 'warn' ? 50 : 10,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar chart */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-slate-600">Score Radar</h3>
          {version && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
              version === 'v4'
                ? 'bg-violet-50 text-violet-600 border-violet-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              Uniswap {version === 'v4' ? 'V4' : 'V3'}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Radar
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Parameter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {parameters.map((p) => (
          <div key={p.id} className={`rounded-lg border p-3 ${STATUS_BG[p.status]}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">{p.label}</span>
              <div className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`} />
            </div>
            <div
              className={`text-lg font-bold ${STATUS_VALUE_COLOR[p.status]}`}
              style={{ color: STATUS_COLOR[p.status] }}
            >
              {p.displayValue}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-tight">{p.detail}</p>
            {p.rawData && Object.keys(p.rawData).length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200/70">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {Object.entries(p.rawData).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-slate-400 text-[10px] truncate">{k}</dt>
                      <dd className="text-slate-500 text-[10px] font-mono text-right truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {PARAM_DATA_SOURCE[p.id] && (
              <div className="mt-2 pt-2 border-t border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">API </span>
                <span className="text-[10px] text-slate-400 font-mono leading-snug">
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
