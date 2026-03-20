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

      {/* Strategy comparison table */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Confronto strategie — 30 giorni simulati</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th className="text-left pb-2 pr-3 font-medium">Strategia</th>
              <th className="text-left pb-2 pr-3 font-medium">Range</th>
              <th className="text-center pb-2 pr-3 font-medium">Rebalancing</th>
              <th className="text-left pb-2 pr-3 font-medium">Fee relative</th>
              <th className="text-left pb-2 font-medium">Rischio</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {strategies.map((s) => (
              <tr key={s.id} className={`border-t border-slate-200 ${activeStrategies.includes(s.id) ? '' : 'opacity-40'}`}>
                <td className="py-2 pr-3 font-semibold whitespace-nowrap" style={{ color: s.color }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: s.color }} />
                  {s.label}
                </td>
                <td className="py-2 pr-3 text-slate-600 font-mono text-xs">
                  {s.rangeMax >= 99999 ? '$0 – ∞' : `$${s.rangeMin.toLocaleString()} – $${s.rangeMax.toLocaleString()}`}
                </td>
                <td className="py-2 pr-3 text-center text-slate-700 font-semibold">{s.rebalanceCount}</td>
                <td className="py-2 pr-3 text-slate-600">
                  {s.id === 'passive' && 'Basse (liquidità diluita)'}
                  {s.id === 'narrow' && <span className="text-emerald-600 font-medium">Alte (range stretto)</span>}
                  {s.id === 'asymmetric' && 'Medie (cattura rialzo)'}
                  {s.id === 'defensive' && 'Basse-medie (range ampio)'}
                </td>
                <td className="py-2 text-slate-600">
                  {s.id === 'passive' && <span className="text-emerald-600">Basso — mai fuori range</span>}
                  {s.id === 'narrow' && <span className="text-amber-600">Alto — esce spesso, gas + IL amplificato</span>}
                  {s.id === 'asymmetric' && <span className="text-amber-600">Medio — perde se ETH scende</span>}
                  {s.id === 'defensive' && <span className="text-emerald-600">Basso — esce solo su movimenti estremi</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400 italic">
          * Ricerca Spinoglio 2024 su ETH/USDC: il rebalancing frequente moltiplica l'IL fino a 5× ma le fee solo di 1.5×. Ribilanciare spesso raramente conviene.
        </p>
      </div>

      {/* Step-by-step rebalancing walkthrough */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Cosa succede durante un rebalancing — esempio Range Stretto ±10%</p>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th className="text-left pb-2 pr-4 font-medium">Giorno</th>
              <th className="text-left pb-2 pr-4 font-medium">Evento</th>
              <th className="text-left pb-2 font-medium">Cosa succede alla posizione</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">0</td>
              <td className="py-2 pr-4 text-slate-600">Apri posizione a $2,000</td>
              <td className="py-2 text-slate-700">
                <div>Range: <span className="font-semibold">$1,800 – $2,200</span> (±10%)</div>
                <div>Depositi 50% ETH + 50% USDC</div>
                <div className="text-emerald-600 font-semibold mt-0.5">Fee attive — guadagni su ogni swap nel range</div>
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">1–12</td>
              <td className="py-2 pr-4 text-slate-600">ETH oscilla nel range ($1,960 – $2,320)</td>
              <td className="py-2 text-slate-700">
                <div>Finche il prezzo resta tra $1,800 e $2,200: <span className="text-emerald-600 font-semibold">accumuli fee</span></div>
                <div className="text-xs text-slate-400 mt-0.5">Fee alte perche la liquidita e concentrata in un range stretto (efficienza V3)</div>
              </td>
            </tr>
            <tr className="border-t border-slate-200 bg-amber-50/50">
              <td className="py-2 pr-4 text-amber-600 font-semibold whitespace-nowrap">13 ⟳</td>
              <td className="py-2 pr-4 text-slate-600">ETH sale a $2,440 — <strong className="text-amber-600">esce dal range sopra</strong></td>
              <td className="py-2 text-slate-700">
                <div className="text-amber-600 font-semibold">Fee = 0 — la posizione non lavora piu</div>
                <div>La posizione e ora 100% USDC (hai venduto tutto l'ETH durante la salita)</div>
                <div className="mt-1"><span className="text-slate-400">Rebalancing:</span> chiudi la posizione, <span className="text-amber-600 font-semibold">realizzi l'IL</span>, riapri con nuovo range centrato su $2,440</div>
                <div className="text-xs text-red-500 mt-0.5">Costo: gas fee + IL cristallizzato (non piu recuperabile)</div>
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">14–25</td>
              <td className="py-2 pr-4 text-slate-600">ETH torna verso $1,900</td>
              <td className="py-2 text-slate-700">
                <div>Nuovo range attivo, accumuli fee di nuovo</div>
                <div className="text-xs text-slate-400 mt-0.5">Ma l'IL del primo rebalancing e gia perso — non si recupera</div>
              </td>
            </tr>
            <tr className="border-t border-slate-200 bg-amber-50/50">
              <td className="py-2 pr-4 text-amber-600 font-semibold whitespace-nowrap">26 ⟳</td>
              <td className="py-2 pr-4 text-slate-600">ETH scende a $1,860 — <strong className="text-amber-600">esce dal range sotto</strong></td>
              <td className="py-2 text-slate-700">
                <div className="text-amber-600 font-semibold">Fee = 0 di nuovo</div>
                <div>La posizione e ora 100% ETH (hai comprato ETH durante la discesa)</div>
                <div className="mt-1"><span className="text-slate-400">Rebalancing:</span> chiudi e riapri — <span className="text-amber-600 font-semibold">altro IL cristallizzato</span></div>
              </td>
            </tr>
            <tr className="border-t border-slate-200 bg-slate-100/50">
              <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">30</td>
              <td className="py-2 pr-4 text-slate-600">Bilancio finale</td>
              <td className="py-2 text-slate-700">
                <div><span className="text-emerald-600 font-semibold">Fee guadagnate:</span> alte (range stretto → efficienza V3)</div>
                <div><span className="text-red-500 font-semibold">IL realizzato:</span> 2 rebalancing × IL cristallizzato</div>
                <div><span className="text-red-500 font-semibold">Gas speso:</span> 2 × (chiudi + apri posizione)</div>
                <div className="mt-1 text-amber-600 font-semibold">Spesso fee &lt; IL + gas — ecco perche il rebalancing frequente raramente conviene</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IL crystallization explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="text-emerald-700 font-semibold text-sm mb-1">Senza rebalancing (Passiva)</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            L'IL e <span className="text-slate-700 font-medium">temporaneo</span> — se il prezzo torna al punto iniziale, l'IL si azzera.
            Fee basse ma nessun IL cristallizzato e nessun gas speso.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-amber-700 font-semibold text-sm mb-1">Con rebalancing (Range Stretto)</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Ogni rebalancing <span className="text-amber-700 font-medium">cristallizza l'IL</span> — lo rende permanente.
            Anche se il prezzo torna al punto iniziale, l'IL dei rebalancing precedenti e perso per sempre.
          </p>
        </div>
      </div>
    </div>
  )
}
