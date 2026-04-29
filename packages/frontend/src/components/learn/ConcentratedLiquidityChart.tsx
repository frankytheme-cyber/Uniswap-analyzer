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
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Liquidità', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 11 }} />
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

      {/* Definition: profondità */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-indigo-700 mb-1">Cos'è la "profondità al prezzo corrente"?</p>
        <p className="text-xs text-slate-600 leading-relaxed">
          La <strong className="text-indigo-700">profondità</strong> misura quanta liquidità è disponibile esattamente al prezzo di mercato attuale.
          È il "muro" di capitale che un ordine deve attraversare per spostare il prezzo.
          Più profondità = ordini più grandi prima che il prezzo si muova = meno slippage per i trader.
        </p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Nel grafico sopra, l'altezza delle barre al prezzo corrente ($2,000) rappresenta la profondità.
          In V2 la profondità è bassa (100 unità) perché il capitale è spalmato su tutti i prezzi.
          In V3, concentrando lo stesso capitale in un range ristretto, la profondità al prezzo corrente aumenta proporzionalmente.
        </p>
      </div>

      {/* Efficiency comparison */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Efficienza del capitale — confronto V2 vs V3</p>
        </div>

        {/* V2 vs V3 rows */}
        <div className="divide-y divide-slate-100">
          <div className="px-4 py-3 flex items-start gap-3">
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 font-mono text-[10px] font-bold shrink-0 mt-0.5">V2</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Liquidità distribuita da $0 a infinito — la maggior parte del capitale non lavora</p>
              <p className="font-mono text-sm text-slate-700">Profondità al prezzo corrente: <span className="text-indigo-600 font-semibold">100 unità</span></p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-start gap-3">
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 font-mono text-[10px] font-bold shrink-0 mt-0.5">V3</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Stesso capitale concentrato nel range ${rangeMin.toLocaleString()}–${rangeMax.toLocaleString()}</p>
              <p className="font-mono text-sm text-slate-700">Profondità al prezzo corrente: <span className="text-emerald-600 font-semibold">{peakConc} unità</span></p>
            </div>
          </div>
        </div>

        {/* Step-by-step */}
        <div className="border-t border-slate-200">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Step-by-step: da dove arriva {peakConc}?</p>
          </div>

          {/* Base V2 */}
          <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50/30">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 text-[10px] font-bold shrink-0 mt-0.5">REF</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">In V2 la liquidità copre da $0 a infinito — fissiamo la profondità come riferimento</p>
                <div className="bg-white border border-slate-200 rounded-md px-3 py-2 inline-block">
                  <p className="font-mono text-sm text-slate-700">Profondità V2 = <span className="text-indigo-600 font-semibold">100 unità</span> <span className="text-slate-400 text-xs">(baseline)</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1 */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">1</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Scegli un range V3 di ±{rangePct}% attorno al prezzo corrente ($2,000)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase">Limite basso</p>
                  <p className="font-mono text-sm text-slate-700">$2,000 × (1 − {rangePct}/100) = <span className="font-semibold">${rangeMin.toLocaleString()}</span></p>
                </div>
                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase">Limite alto</p>
                  <p className="font-mono text-sm text-slate-700">$2,000 × (1 + {rangePct}/100) = <span className="font-semibold">${rangeMax.toLocaleString()}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">2</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">V3 concentra <strong className="text-slate-700">tutto</strong> il capitale nel range — meno tick = più liquidità per tick</p>
              <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                <p className="font-mono text-sm text-slate-700 leading-relaxed">
                  Concentrazione = riferimento × (50 / range%)<br />
                  = <span className="text-indigo-600">100</span> × (50 / <span className="text-emerald-600">{rangePct}</span>) = 100 × {(50 / rangePct).toFixed(2)}<br />
                  = <span className="text-emerald-600 font-semibold">{peakConc} unità</span>
                </p>
              </div>
            </div>
          </div>

          {/* Risultato */}
          <div className="px-4 py-3 bg-emerald-50/30">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold shrink-0 mt-0.5">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-2">Risultato: quante volte più profonda è la liquidità V3 rispetto a V2</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Efficienza</p>
                    <p className="font-mono text-lg font-bold text-indigo-600">{efficiency}×</p>
                  </div>
                  <div className="bg-white border border-emerald-200 rounded-md px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Fee generate</p>
                    <p className="font-mono text-lg font-bold text-emerald-600">{efficiency}×</p>
                    <p className="text-[10px] text-slate-400">rispetto a V2</p>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-md px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Trade-off</p>
                    <p className="font-mono text-xs font-semibold text-amber-600 mt-1">Fuori da ${rangeMin.toLocaleString()}–${rangeMax.toLocaleString()}</p>
                    <p className="text-[10px] text-amber-500">fee = 0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-400 italic">
            * Formula semplificata. In V3, la liquidità è <strong className="text-slate-500">uniforme</strong> nel range scelto.
            Il fattore 50 è il riferimento V2: a ±50% l'efficienza è 1×. Range più stretto → efficienza più alta.
          </p>
        </div>
      </div>

      {/* Explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="text-indigo-600 font-semibold text-sm mb-1">Full Range (V2)</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Con $400,000 nella pool ETH/USDC, la liquidità è distribuita uniformemente su tutti i prezzi (da $0 a infinito).
            La maggior parte del capitale è <span className="text-slate-700 font-medium">inattiva</span> e non guadagna fee.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="text-emerald-700 font-semibold text-sm mb-1">Concentrata (V3) — {efficiency}× più efficiente</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Con lo stesso capitale nella pool ETH/USDC, concentrato nel range ${(rangeMin).toLocaleString()}–${(rangeMax).toLocaleString()}.
            Ogni swap genera <span className="text-emerald-700 font-medium">{efficiency}× più fee</span> per gli LP.
          </p>
        </div>
      </div>
    </div>
  )
}
