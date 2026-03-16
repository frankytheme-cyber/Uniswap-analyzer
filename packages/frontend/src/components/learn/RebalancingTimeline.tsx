import { useState } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'

// Simulated ETH price history over 30 days (centered at $2,000)
// Phase 1: sideways (days 0-9), Phase 2: bullish spike (days 10-20), Phase 3: pullback (days 21-30)
const priceHistory = [
  { day: 0,  price: 2000 },
  { day: 1,  price: 2020 },
  { day: 2,  price: 1980 },
  { day: 3,  price: 2000 },
  { day: 4,  price: 2040 },
  { day: 5,  price: 1960 },
  { day: 6,  price: 2020 },
  { day: 7,  price: 2000 },
  { day: 8,  price: 2060 },
  { day: 9,  price: 2020 },
  { day: 10, price: 2100 },
  { day: 11, price: 2200 },
  { day: 12, price: 2320 },
  { day: 13, price: 2440 },  // exit narrow range ($2,200) → rebalance
  { day: 14, price: 2560 },
  { day: 15, price: 2680 },
  { day: 16, price: 2600 },
  { day: 17, price: 2520 },
  { day: 18, price: 2400 },
  { day: 19, price: 2300 },
  { day: 20, price: 2240 },
  { day: 21, price: 2160 },
  { day: 22, price: 2080 },
  { day: 23, price: 2000 },  // re-enter narrow range
  { day: 24, price: 1940 },
  { day: 25, price: 1900 },
  { day: 26, price: 1860 },  // exit narrow range below ($1,800) → rebalance again
  { day: 27, price: 1800 },
  { day: 28, price: 1840 },
  { day: 29, price: 1880 },
  { day: 30, price: 1920 },
]

interface Strategy {
  id: string
  label: string
  color: string
  rangeMin: number
  rangeMax: number
  description: string
  rebalanceCount: number
}

const strategies: Strategy[] = [
  {
    id: 'passive',
    label: 'Passiva (full range)',
    color: '#6366f1',
    rangeMin: 0,
    rangeMax: 99999,
    description: 'Mai fuori range. Zero rebalancing, fee basse perche la liquidita e diluita su tutti i prezzi.',
    rebalanceCount: 0,
  },
  {
    id: 'narrow',
    label: 'Range stretto ±10%',
    color: '#f59e0b',
    rangeMin: 1800,
    rangeMax: 2200,
    description: 'Esce dal range quando ETH supera $2,200 (giorno 13) e quando scende sotto $1,800 (giorno 26). 2 rebalancing necessari.',
    rebalanceCount: 2,
  },
  {
    id: 'asymmetric',
    label: 'Asimmetrica rialzista',
    color: '#10b981',
    rangeMin: 2000,
    rangeMax: 2800,
    description: 'Cattura il rialzo di ETH fino a $2,800. Esce solo al ribasso sotto $2,000 (giorno 26). 1 rebalancing.',
    rebalanceCount: 1,
  },
  {
    id: 'defensive',
    label: 'Difensiva',
    color: '#ef4444',
    rangeMin: 1200,
    rangeMax: 2600,
    description: 'Range ampio $1,200–$2,600. Esce solo al picco estremo ($2,680 giorno 15). Fee piu basse della narrow ma molto meno rebalancing.',
    rebalanceCount: 0,
  },
]

const fmtPrice = (v: number) => `$${(v / 1000).toFixed(1)}K`

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-card">
      <div className="text-slate-400 mb-1">Giorno {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          ETH: <span className="font-medium">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function RebalancingTimeline() {
  const [activeStrategies, setActiveStrategies] = useState<string[]>(['passive', 'narrow'])

  const toggleStrategy = (id: string) => {
    setActiveStrategies((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Strategy toggles */}
      <div className="flex flex-wrap gap-2">
        {strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => toggleStrategy(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeStrategies.includes(s.id)
                ? 'border-transparent'
                : 'border-slate-200 text-slate-400 bg-transparent'
            }`}
            style={activeStrategies.includes(s.id) ? { background: s.color + '33', borderColor: s.color, color: s.color } : {}}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={priceHistory} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
            <XAxis
              dataKey="day"
              label={{ value: 'Giorni', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              domain={[1400, 3000]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={fmtPrice}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Shaded ranges for active strategies */}
            {strategies
              .filter((s) => activeStrategies.includes(s.id) && s.rangeMax < 99999)
              .map((s) => (
                <ReferenceArea
                  key={s.id}
                  y1={s.rangeMin}
                  y2={s.rangeMax}
                  fill={s.color}
                  fillOpacity={0.06}
                  stroke={s.color}
                  strokeOpacity={0.25}
                  strokeDasharray="4 3"
                />
              ))}

            {/* Rebalancing events — narrow strategy */}
            {activeStrategies.includes('narrow') && (
              <>
                <ReferenceLine x={13} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 2"
                  label={{ value: '⟳', position: 'top', fill: '#f59e0b', fontSize: 14 }} />
                <ReferenceLine x={26} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 2"
                  label={{ value: '⟳', position: 'top', fill: '#f59e0b', fontSize: 14 }} />
              </>
            )}
            {activeStrategies.includes('asymmetric') && (
              <ReferenceLine x={26} stroke="#10b981" strokeWidth={2} strokeDasharray="3 2"
                label={{ value: '⟳', position: 'top', fill: '#10b981', fontSize: 14 }} />
            )}

            {/* Price line */}
            <Line
              dataKey="price"
              stroke="#1e293b"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="Prezzo ETH"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-400 mt-1 pl-1">⟳ = evento di rebalancing (chiudi posizione, riapri con nuovo range)</p>
      </div>

      {/* Strategy detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strategies
          .filter((s) => activeStrategies.includes(s.id))
          .map((s) => (
            <div
              key={s.id}
              className="rounded-lg p-3 border"
              style={{ background: s.color + '0d', borderColor: s.color + '33' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: s.color }}>{s.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {s.rebalanceCount} rebalancing
                </span>
              </div>
              <p className="text-xs text-slate-500">{s.description}</p>
              {s.rangeMax < 99999 && (
                <p className="text-xs text-slate-400 mt-1">Range: ${s.rangeMin.toLocaleString()} – ${s.rangeMax.toLocaleString()}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
