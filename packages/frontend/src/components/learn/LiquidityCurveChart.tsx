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
          Pool piu grande = piu liquidita = meno price impact a parita di ordine
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
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Calcolo step-by-step: come funziona x · y = k</p>
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
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">Prima</td>
                <td className="py-2 pr-4 text-slate-600">La pool contiene due token in equilibrio</td>
                <td className="py-2 text-slate-700">
                  <div>ETH = {fmtN(poolEth)} &nbsp; USDC = {fmtN(tradeResult.usdcInPool)}</div>
                  <div>k = {fmtN(poolEth)} × {fmtN(tradeResult.usdcInPool)} = <span className="text-indigo-600 font-semibold">{fmtN(k)}</span></div>
                  <div>Spot = {fmtN(tradeResult.usdcInPool)} ÷ {fmtN(poolEth)} = <span className="text-indigo-600 font-semibold">{fmtD(tradeResult.spotPrice)} USDC/ETH</span></div>
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">1</td>
                <td className="py-2 pr-4 text-slate-600">Togli {fmtN(effectiveDx)} ETH dalla pool</td>
                <td className="py-2 text-slate-700">{fmtN(poolEth)} - {fmtN(effectiveDx)} = <span className="font-semibold">{fmtN(tradeResult.ethAfter)} ETH</span></td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">2</td>
                <td className="py-2 pr-4 text-slate-600">k resta costante, la pool ricalcola gli USDC</td>
                <td className="py-2 text-slate-700">{fmtN(k)} ÷ {fmtN(tradeResult.ethAfter)} = <span className="font-semibold">{fmtN(tradeResult.usdcAfter)} USDC</span></td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">3</td>
                <td className="py-2 pr-4 text-slate-600">Il trader paga la differenza in USDC</td>
                <td className="py-2 text-indigo-600 font-semibold">{fmtN(tradeResult.usdcAfter)} - {fmtN(tradeResult.usdcInPool)} = {fmtN(tradeResult.usdcPaid)} USDC</td>
              </tr>
              <tr className="border-t border-slate-200 bg-slate-100/50">
                <td className="py-2 pr-4 text-slate-400 font-semibold whitespace-nowrap">Dopo</td>
                <td className="py-2 pr-4 text-slate-600">Il prezzo si è spostato</td>
                <td className="py-2 text-slate-700">
                  <div>Prezzo medio: {fmtN(tradeResult.usdcPaid)} ÷ {fmtN(effectiveDx)} = <span className="font-semibold">{fmtD(tradeResult.priceAvg)} USDC/ETH</span></div>
                  <div className={tradeResult.impact > 5 ? 'text-amber-600 font-semibold' : 'text-indigo-600 font-semibold'}>Price impact: +{tradeResult.impact.toFixed(2)}%</div>
                  <div>Nuovo spot: {fmtN(tradeResult.usdcAfter)} ÷ {fmtN(tradeResult.ethAfter)} = <span className="text-indigo-600 font-semibold">{fmtD(tradeResult.newSpotPrice)} USDC/ETH</span></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
