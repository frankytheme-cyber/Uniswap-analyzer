import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
} from 'recharts'

// Pool at equilibrium: poolEth ETH at $2,000 each
// K = poolEth * (poolEth * 2000)
function getK(poolEth: number) {
  return poolEth * poolEth * 2000
}

function buildCurve(k: number, poolEth: number): { x: number; y: number }[] {
  const pts = []
  const xMin = Math.max(5, Math.floor(poolEth * 0.1))
  const xMax = Math.ceil(poolEth * 5)
  const step = Math.max(1, Math.floor((xMax - xMin) / 120))
  for (let x = xMin; x <= xMax; x += step) {
    pts.push({ x, y: k / x })
  }
  return pts
}

function computeTrade(k: number, ethInPool: number, dx: number) {
  const usdcInPool = k / ethInPool
  const ethAfter = ethInPool - dx
  if (ethAfter <= 0) return null
  const usdcAfter = k / ethAfter
  const usdcPaid = usdcAfter - usdcInPool
  const priceAvg = usdcPaid / dx
  const spotPrice = usdcInPool / ethInPool
  const impact = ((priceAvg - spotPrice) / spotPrice) * 100
  const newSpotPrice = usdcAfter / ethAfter
  return {
    ethAfter,
    usdcInPool,
    usdcAfter,
    usdcPaid,
    priceAvg,
    spotPrice,
    newSpotPrice,
    impact,
  }
}

const fmtK = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return String(v)
}
const fmtN = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 0 })
const fmtD = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 })

const CustomDot = (props: { cx?: number; cy?: number }) => {
  const { cx = 0, cy = 0 } = props
  return <circle cx={cx} cy={cy} r={6} fill="#6366f1" stroke="#fff" strokeWidth={2} />
}

const POOL_SIZES = [
  { label: '50 ETH',     eth: 50 },
  { label: '100 ETH',    eth: 100 },
  { label: '500 ETH',    eth: 500 },
  { label: '1,000 ETH',  eth: 1000 },
  { label: '5,000 ETH',  eth: 5000 },
  { label: '10,000 ETH', eth: 10000 },
]

export default function LiquidityCurveChart() {
  const [poolEth, setPoolEth] = useState(100)
  const [dx, setDx] = useState(10)

  const k = useMemo(() => getK(poolEth), [poolEth])
  const curveData = useMemo(() => buildCurve(k, poolEth), [k, poolEth])
  const tradeResult = useMemo(() => computeTrade(k, poolEth, dx), [k, poolEth, dx])

  const usdcInPool = k / poolEth

  const currentPoint = [{ x: poolEth, y: usdcInPool }]
  const postPoint = tradeResult ? [{ x: tradeResult.ethAfter, y: tradeResult.usdcAfter }] : []

  // Chart domains
  const xMin = Math.max(5, Math.floor(poolEth * 0.1))
  const xMax = Math.ceil(poolEth * 5)
  const yMin = Math.floor(k / xMax)
  const yMax = Math.ceil(k / xMin)

  // Clamp dx when pool size changes
  const maxDx = Math.floor(poolEth * 0.6)
  const effectiveDx = Math.min(dx, maxDx)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              label={{ value: 'ETH nella pool', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={fmtK}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[yMin, yMax]}
              tickFormatter={fmtK}
              label={{ value: 'USDC nella pool', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip content={() => null} />
            {/* Hyperbola */}
            <Line
              data={curveData}
              dataKey="y"
              type="monotone"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {/* Current position */}
            <Scatter data={currentPoint} dataKey="y" fill="#6366f1" shape={<CustomDot />} />
            {/* Post-trade position */}
            {tradeResult && (
              <Scatter data={postPoint} dataKey="y" fill="#f59e0b" shape={<CustomDot />} />
            )}
            {/* Vertical lines */}
            <ReferenceLine x={poolEth} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.5} />
            {tradeResult && (
              <ReferenceLine x={tradeResult.ethAfter} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend dots */}
        <div className="flex gap-4 mt-2 pl-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Stato attuale pool</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Dopo l'acquisto</span>
        </div>
      </div>

      {/* Pool size selector */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5">
          Dimensione della pool: <span className="text-slate-800 font-medium">{fmtN(poolEth)} ETH + {fmtN(usdcInPool)} USDC</span>
          <span className="text-slate-400 ml-2">(k = {fmtK(k)})</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {POOL_SIZES.map((ps) => (
            <button
              key={ps.eth}
              onClick={() => { setPoolEth(ps.eth); setDx(Math.min(dx, Math.floor(ps.eth * 0.6))) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                poolEth === ps.eth
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {ps.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1.5 italic">
          Pool più grande = più liquidità = meno price impact a parità di ordine
        </p>
      </div>

      {/* Buy amount slider */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Acquisto ETH: <span className="text-slate-800 font-medium">{effectiveDx} ETH</span>
          <span className="text-slate-400 ml-2">({((effectiveDx / poolEth) * 100).toFixed(1)}% della pool)</span>
        </label>
        <input
          type="range" min={1} max={maxDx} step={1} value={effectiveDx}
          onChange={(e) => setDx(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
          <span>1 ETH</span><span>{fmtN(maxDx)} ETH</span>
        </div>
      </div>

      {/* Stats */}
      {tradeResult && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">USDC pagati</div>
            <div className="text-slate-800 font-semibold">{fmtN(tradeResult.usdcPaid)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Prezzo medio</div>
            <div className="text-slate-800 font-semibold">{fmtD(tradeResult.priceAvg)} USDC/ETH</div>
          </div>
          <div className={`rounded-lg p-3 text-center border ${tradeResult.impact > 5 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-xs text-slate-400 mb-1">Price impact</div>
            <div className={`font-semibold ${tradeResult.impact > 5 ? 'text-red-600' : 'text-amber-600'}`}>
              +{tradeResult.impact.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Reactive math walkthrough */}
      {tradeResult && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Calcolo step-by-step: come funziona x · y = k</p>
          </div>

          {/* Step: Prima — stato iniziale */}
          <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/30">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 text-[10px] font-bold shrink-0 mt-0.5">PRE</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-2">La pool contiene due token in equilibrio</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Riserve</p>
                    <p className="font-mono text-sm text-slate-700"><span className="text-indigo-600 font-semibold">{fmtN(poolEth)}</span> ETH + <span className="text-blue-600 font-semibold">{fmtN(tradeResult.usdcInPool)}</span> USDC</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Costante k</p>
                    <p className="font-mono text-sm"><span className="text-indigo-600">{fmtN(poolEth)}</span> × <span className="text-blue-600">{fmtN(tradeResult.usdcInPool)}</span> = <span className="text-amber-600 font-semibold">{fmtN(k)}</span></p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Prezzo spot</p>
                    <p className="font-mono text-sm"><span className="text-blue-600">{fmtN(tradeResult.usdcInPool)}</span> ÷ <span className="text-indigo-600">{fmtN(poolEth)}</span> = <span className="text-emerald-600 font-semibold">{fmtD(tradeResult.spotPrice)}</span> <span className="text-slate-400 text-xs">USDC/ETH</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps 1-2-3 */}
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">1</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Togli {fmtN(effectiveDx)} ETH dalla pool</p>
                <p className="font-mono text-sm text-slate-700">
                  <span className="text-indigo-600">{fmtN(poolEth)}</span> − {fmtN(effectiveDx)} = <span className="text-indigo-600 font-semibold">{fmtN(tradeResult.ethAfter)} ETH</span>
                </p>
              </div>
            </div>

            <div className="px-4 py-3 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">2</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1"><span className="text-amber-600 font-medium">k</span> resta costante → la pool ricalcola gli USDC</p>
                <p className="font-mono text-sm text-slate-700">
                  <span className="text-amber-600">{fmtN(k)}</span> ÷ <span className="text-indigo-600">{fmtN(tradeResult.ethAfter)}</span> = <span className="text-blue-600 font-semibold">{fmtN(tradeResult.usdcAfter)} USDC</span>
                </p>
              </div>
            </div>

            <div className="px-4 py-3 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">3</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Il trader paga la differenza in USDC</p>
                <p className="font-mono text-sm text-indigo-600 font-semibold">
                  {fmtN(tradeResult.usdcAfter)} − {fmtN(tradeResult.usdcInPool)} = {fmtN(tradeResult.usdcPaid)} USDC
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: nuovo prezzo */}
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">4</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Il nuovo prezzo ETH si ricava dalle riserve aggiornate: <span className="text-emerald-600 font-medium">P = y / x</span></p>
                <p className="font-mono text-sm text-slate-700">
                  <span className="text-blue-600">{fmtN(tradeResult.usdcAfter)}</span> ÷ <span className="text-indigo-600">{fmtN(tradeResult.ethAfter)}</span> = <span className="text-emerald-600 font-semibold">{fmtD(tradeResult.newSpotPrice)} USDC/ETH</span>
                  <span className="text-slate-400 ml-2 text-xs">(era {fmtD(tradeResult.spotPrice)})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Step: Dopo — risultato */}
          <div className="px-4 py-3 border-t border-slate-200 bg-amber-50/30">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold shrink-0 mt-0.5">POST</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-2">Riepilogo dello swap</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Prezzo medio pagato</p>
                    <p className="font-mono text-sm text-slate-700">
                      {fmtN(tradeResult.usdcPaid)} ÷ {fmtN(effectiveDx)} = <span className="font-semibold">{fmtD(tradeResult.priceAvg)}</span> <span className="text-slate-400 text-xs">USDC/ETH</span>
                    </p>
                  </div>
                  <div className={`border rounded-md px-3 py-2 ${tradeResult.impact > 5 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-[10px] text-slate-400 uppercase">Price impact</p>
                    <p className={`font-mono text-sm font-semibold ${tradeResult.impact > 5 ? 'text-red-600' : 'text-amber-600'}`}>+{tradeResult.impact.toFixed(2)}%</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Nuovo prezzo ETH</p>
                    <p className="font-mono text-sm text-slate-700">
                      <span className="text-emerald-600 font-semibold">{fmtD(tradeResult.newSpotPrice)}</span> <span className="text-slate-400 text-xs">USDC/ETH</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">+{fmtD(tradeResult.newSpotPrice - tradeResult.spotPrice)} rispetto a prima</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
