import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import MathBlock from './MathBlock'

const CENTER_PRICE = 2000

function buildDepth(center: number) {
  const pts = []
  for (let p = center - 800; p <= center + 800; p += 20) {
    const dist = Math.abs(p - center)
    const depth = Math.max(0, 400 * Math.exp(-0.000005 * dist * dist))
    pts.push({ price: p, depth: Math.round(depth) })
  }
  return pts
}

function computeImpact(centerPrice: number, orderSizeUSD: number, feePct: number) {
  const totalDepthAtCenter = 400
  const slippagePercentPerUnit = 0.015 / totalDepthAtCenter
  const priceImpact = orderSizeUSD * slippagePercentPerUnit * 100
  const execPrice   = centerPrice * (1 + priceImpact / 100)
  const feesEarned  = orderSizeUSD * (feePct / 100)
  const ethAtSpot   = orderSizeUSD / centerPrice
  const ethAtExec   = orderSizeUSD / execPrice
  const slippageUSD = (ethAtSpot - ethAtExec) * execPrice
  return {
    priceImpact: priceImpact,
    execPrice:   execPrice,
    feesEarned:  feesEarned,
    ethAtSpot,
    ethAtExec,
    slippageUSD,
  }
}

const fmtD = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 })
const fmtN = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-card">
      <div className="text-slate-400 mb-1">Prezzo ETH: ${label}</div>
      <div className="text-slate-700">Profondita: <span className="font-medium">{payload[0]?.value.toLocaleString()}</span></div>
    </div>
  )
}

const FEE_TIERS = [
  { label: '0.05%', value: 0.05 },
  { label: '0.30%', value: 0.30 },
  { label: '1.00%', value: 1.00 },
]

export default function PriceImpactChart() {
  const [orderSize, setOrderSize] = useState(10000)
  const [feeTier, setFeeTier] = useState(0.30)

  const result    = useMemo(() => computeImpact(CENTER_PRICE, orderSize, feeTier), [orderSize, feeTier])
  const depthData = useMemo(() => buildDepth(CENTER_PRICE), [])

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={depthData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="depthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="price"
              type="number"
              domain={[CENTER_PRICE - 800, CENTER_PRICE + 800]}
              label={{ value: 'Prezzo ETH (USDC)', position: 'insideBottom', offset: -8, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
            />
            <YAxis
              dataKey="depth"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              label={{ value: 'Liquidita disponibile', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              dataKey="depth"
              type="monotone"
              stroke="#818cf8"
              fill="url(#depthGrad)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={CENTER_PRICE}
              stroke="#fcd34d"
              strokeWidth={2}
              label={{ value: 'Prezzo corrente ETH', position: 'top', fill: '#d97706', fontSize: 10 }}
            />
            <ReferenceLine
              x={result.execPrice}
              stroke="#fca5a5"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: 'Dopo acquisto', position: 'top', fill: '#ef4444', fontSize: 10 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Controls: order size + fee tier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Ordine di acquisto: <span className="text-slate-800 font-medium">${orderSize.toLocaleString()}</span> di ETH
          </label>
          <input
            type="range" min={500} max={100000} step={500} value={orderSize}
            onChange={(e) => setOrderSize(Number(e.target.value))}
            className="w-full accent-red-400"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>$500</span><span>$100,000</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fee tier</label>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {FEE_TIERS.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFeeTier(ft.value)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  feeTier === ft.value ? 'bg-white text-slate-800 shadow-card' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Prezzo esecuzione</div>
          <div className="text-slate-800 font-semibold">${fmtD(result.execPrice)}</div>
          <div className="text-xs text-slate-400 mt-0.5">vs ${fmtN(CENTER_PRICE)}</div>
        </div>
        <div className={`rounded-lg p-3 text-center border ${result.priceImpact > 1 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-xs text-slate-400 mb-1">Price impact</div>
          <div className={`font-semibold ${result.priceImpact > 1 ? 'text-red-600' : result.priceImpact > 0.3 ? 'text-amber-600' : 'text-emerald-600'}`}>
            +{result.priceImpact.toFixed(3)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{result.priceImpact > 1 ? 'Elevato' : result.priceImpact > 0.3 ? 'Moderato' : 'Basso'}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Fee guadagnate LP</div>
          <div className="text-emerald-700 font-semibold">${fmtD(result.feesEarned)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{feeTier}% fee tier</div>
        </div>
      </div>

      {/* Math walkthrough */}
      <MathBlock
        title="Calcolo step-by-step"
        lines={[
          { text: `Ordine: $${orderSize.toLocaleString()} di ETH`, bold: true },
          { text: '' },
          { text: `Prezzo spot: $${fmtN(CENTER_PRICE)}/ETH`, indent: 1 },
          { text: `A prezzo spot: $${orderSize.toLocaleString()} / $${fmtN(CENTER_PRICE)} = ${fmtD(result.ethAtSpot)} ETH`, indent: 1 },
          { text: '' },
          { text: `Prezzo esecuzione: $${fmtD(result.execPrice)}/ETH`, indent: 1, highlight: 'result' },
          { text: `ETH ricevuti: $${orderSize.toLocaleString()} / $${fmtD(result.execPrice)} = ${fmtD(result.ethAtExec)} ETH`, indent: 1, highlight: 'result' },
          { text: '' },
          { text: `Slippage pagato: ~$${fmtD(result.slippageUSD)} (${result.priceImpact.toFixed(3)}%)`, indent: 1, highlight: result.priceImpact > 1 ? 'note' : 'formula' },
          { text: `Fee ${feeTier}%: $${fmtD(result.feesEarned)} -> distribuita agli LP attivi nel range`, indent: 1 },
        ]}
      />

      <p className="text-xs text-slate-400 italic">
        * Modello semplificato. Il price impact reale dipende dalla distribuzione dei tick e dalla concentrazione della liquidita V3.
      </p>
    </div>
  )
}
