import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
const CENTER_PRICE = 2000

// Build ticks data dynamically based on range width
// In V3, a single LP position has UNIFORM liquidity across the entire range.
// The efficiency (height) depends on range width: narrower range = same capital
// spread over fewer ticks = more liquidity per tick.
// Formula: efficiency ≈ fullRange / concentratedRange (simplified)
function buildTicks(rangePct: number) {
  const priceMin = CENTER_PRICE * (1 - rangePct / 100)
  const priceMax = CENTER_PRICE * (1 + rangePct / 100)
  const allPrices = []
  for (let p = 1200; p <= 2800; p += 100) allPrices.push(p)

  // V3 efficiency: same capital in a narrower range = proportionally deeper liquidity
  // If full range covers ~$0-$∞ and V3 covers ±rangePct%, the concentration is roughly:
  // efficiency = referenceFullRange / (2 * rangePct%) — capped for display
  const concLiquidity = Math.round(Math.min(100 * (50 / rangePct), 500))

  return allPrices.map((price) => {
    const inRange = price >= priceMin && price <= priceMax

    return {
      label: `$${(price / 1000).toFixed(1)}K`,
      price,
      liquidityFull: 100,
      liquidityConc: inRange ? concLiquidity : 0,
    }
  })
}

type Mode = 'full' | 'concentrated' | 'both'

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-card">
      <div className="text-slate-400 mb-1">Prezzo ETH: {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">
            {p.name === 'liquidityFull' ? 'Full range (V2)' : 'Concentrata (V3)'}:{' '}
            <span className="text-slate-800 font-medium">{p.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ConcentratedLiquidityChart() {
  const [mode, setMode] = useState<Mode>('both')
  const [rangePct, setRangePct] = useState(20) // ±20% default

  const ticks = useMemo(() => buildTicks(rangePct), [rangePct])

  // Efficiency = peak concentrated / full range
  const peakConc = Math.max(...ticks.map((t) => t.liquidityConc))
  const efficiency = peakConc > 0 ? (peakConc / 100).toFixed(1) : '—'

  const rangeMin = CENTER_PRICE * (1 - rangePct / 100)
  const rangeMax = CENTER_PRICE * (1 + rangePct / 100)

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['full', 'concentrated', 'both'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === m ? 'bg-white text-slate-800 shadow-card' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'full' ? 'Full Range (V2)' : m === 'concentrated' ? 'Concentrata (V3)' : 'Confronto'}
            </button>
          ))}
        </div>
      </div>

      {/* Range width slider */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Larghezza range V3: <span className="text-slate-800 font-medium">±{rangePct}%</span>
          <span className="text-slate-400 ml-2">
            (${(rangeMin / 1000).toFixed(1)}K – ${(rangeMax / 1000).toFixed(1)}K)
          </span>
        </label>
        <input
          type="range" min={5} max={40} step={1} value={rangePct}
          onChange={(e) => setRangePct(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
          <span>±5% (stretto)</span><span>±40% (largo)</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ticks} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barCategoryGap="10%">
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Liquidita', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => value === 'liquidityFull' ? 'Full Range (V2)' : 'Concentrata (V3)'}
              wrapperStyle={{ fontSize: 11, color: '#64748b' }}
            />
            <ReferenceLine x="$2.0K" stroke="#fcd34d" strokeWidth={2} label={{ value: 'prezzo attuale ETH', position: 'top', fill: '#d97706', fontSize: 10 }} />
            {(mode === 'full' || mode === 'both') && (
              <Bar dataKey="liquidityFull" name="liquidityFull" fill="#a5b4fc" opacity={0.6} radius={[2, 2, 0, 0]}>
                {ticks.map((t) => (
                  <Cell key={t.label} fill="#a5b4fc" fillOpacity={mode === 'both' ? 0.5 : 0.8} />
                ))}
              </Bar>
            )}
            {(mode === 'concentrated' || mode === 'both') && (
              <Bar dataKey="liquidityConc" name="liquidityConc" fill="#6ee7b7" radius={[2, 2, 0, 0]}>
                {ticks.map((t) => (
                  <Cell key={t.label} fill={t.price === CENTER_PRICE ? '#10b981' : '#6ee7b7'} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Efficiency table */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Efficienza del capitale — come si calcola</p>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th className="text-left pb-2 pr-4 font-medium">Versione</th>
              <th className="text-left pb-2 pr-4 font-medium">Cosa succede</th>
              <th className="text-left pb-2 font-medium">Profondità al prezzo corrente</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-indigo-500 font-semibold whitespace-nowrap">V2 Full Range</td>
              <td className="py-2 pr-4 text-slate-600">Liquidità distribuita da $0 a infinito. La maggior parte del capitale è lontana dal prezzo attuale e non lavora</td>
              <td className="py-2 text-slate-700 font-semibold">100 unità</td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-emerald-600 font-semibold whitespace-nowrap">V3 ±{rangePct}%</td>
              <td className="py-2 pr-4 text-slate-600">Stesso capitale concentrato nel range ${rangeMin.toLocaleString()}–${rangeMax.toLocaleString()}. Tutta la liquidità lavora vicino al prezzo corrente</td>
              <td className="py-2 text-indigo-600 font-semibold">{peakConc} unità</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Calcolo step-by-step: da dove arriva {peakConc}?</p>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-xs text-slate-400 uppercase">
                <th className="text-left pb-2 pr-4 font-medium">Step</th>
                <th className="text-left pb-2 pr-4 font-medium">Cosa succede</th>
                <th className="text-left pb-2 font-medium">Calcolo</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">Base V2</td>
                <td className="py-2 pr-4 text-slate-600">In V2 la liquidita copre da $0 a infinito. Fissiamo la profondita al prezzo corrente come riferimento</td>
                <td className="py-2 text-slate-700">
                  <div>Profondita V2 = <span className="text-indigo-600 font-semibold">100 unita</span> (baseline)</div>
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">1</td>
                <td className="py-2 pr-4 text-slate-600">Scegli un range V3 di ±{rangePct}% attorno al prezzo corrente ($2,000)</td>
                <td className="py-2 text-slate-700">
                  <div>Limite basso: $2,000 × (1 - {rangePct}/100) = <span className="font-semibold">${rangeMin.toLocaleString()}</span></div>
                  <div>Limite alto: $2,000 × (1 + {rangePct}/100) = <span className="font-semibold">${rangeMax.toLocaleString()}</span></div>
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">2</td>
                <td className="py-2 pr-4 text-slate-600">V3 concentra <strong>tutto</strong> il capitale in quel range. Meno tick da coprire = piu liquidita per ogni tick</td>
                <td className="py-2 text-slate-700">
                  <div>Concentrazione = riferimento × (50 / range%)</div>
                  <div>= 100 × (50 / {rangePct}) = 100 × {(50 / rangePct).toFixed(2)}</div>
                  <div>= <span className="text-indigo-600 font-semibold">{peakConc} unita</span></div>
                </td>
              </tr>
              <tr className="border-t border-slate-200 bg-slate-100/50">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">Risultato</td>
                <td className="py-2 pr-4 text-slate-600">Efficienza = quante volte piu profonda e la liquidita V3 rispetto a V2</td>
                <td className="py-2 text-slate-700">
                  <div className="text-indigo-600 font-semibold">{peakConc} ÷ 100 = {efficiency}× piu efficiente</div>
                  <div className="text-emerald-600 font-semibold mt-1">Fee generate: {efficiency}× rispetto a V2</div>
                  <div className="text-amber-600 font-semibold mt-1">Trade-off: fuori da ${rangeMin.toLocaleString()}–${rangeMax.toLocaleString()} → fee = 0</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-400 italic">
          * Formula semplificata per scopi didattici. In V3, la liquidita e <strong className="text-slate-500">uniforme</strong> in tutto il range scelto (le barre verdi hanno la stessa altezza).
          Il fattore 50 rappresenta un range V2 di riferimento: quando il range V3 e il 50% del totale (±50%), l'efficienza e 1× (uguale a V2).
          Range piu stretto → divisore piu piccolo → efficienza piu alta.
        </p>
      </div>

      {/* Explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="text-indigo-600 font-semibold text-sm mb-1">Full Range (V2)</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Con $400,000 nella pool ETH/USDC, la liquidita e distribuita uniformemente su tutti i prezzi (da $0 a infinito).
            La maggior parte del capitale e <span className="text-slate-700 font-medium">inattiva</span> e non guadagna fee.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="text-emerald-700 font-semibold text-sm mb-1">Concentrata (V3) — {efficiency}× piu efficiente</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Con lo stesso capitale nella pool ETH/USDC, concentrato nel range ${(rangeMin).toLocaleString()}–${(rangeMax).toLocaleString()}.
            Ogni swap genera <span className="text-emerald-700 font-medium">{efficiency}× piu fee</span> per gli LP.
          </p>
        </div>
      </div>
    </div>
  )
}
