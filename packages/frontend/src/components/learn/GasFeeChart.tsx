import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

const INITIAL_BASE_FEE = 20 // gwei
const NUM_BLOCKS = 50

interface BlockData {
  block: number
  baseFee: number
  totalFee: number
  utilization: number
}

function simulateBlocks(demandPct: number, priorityFee: number): BlockData[] {
  const blocks: BlockData[] = []
  let baseFee = INITIAL_BASE_FEE

  for (let i = 0; i < NUM_BLOCKS; i++) {
    // Add some variance around the demand slider value
    const noise = (Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10)
    const utilization = Math.max(5, Math.min(100, demandPct + noise))
    const gasUsedRatio = utilization / 100

    blocks.push({
      block: i + 1,
      baseFee: Math.round(baseFee * 100) / 100,
      totalFee: Math.round((baseFee + priorityFee) * 100) / 100,
      utilization: Math.round(utilization),
    })

    // EIP-1559: base fee adjusts based on how full the block is vs 50% target
    const delta = gasUsedRatio - 0.5
    baseFee = Math.max(1, baseFee * (1 + 0.125 * delta * 2))
  }

  return blocks
}

export default function GasFeeChart() {
  const [demand, setDemand] = useState(60)
  const [priorityFee, setPriorityFee] = useState(2)

  const data = useMemo(() => simulateBlocks(demand, priorityFee), [demand, priorityFee])

  const lastBaseFee = data[data.length - 1].baseFee
  const burned = useMemo(() => data.reduce((s, d) => s + d.baseFee, 0), [data])

  return (
    <div className="space-y-4">
      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Domanda rete: <span className="text-slate-800 dark:text-slate-200 font-medium">{demand}%</span> utilizzo blocchi
          </label>
          <input
            type="range" min={10} max={95} step={5} value={demand}
            onChange={(e) => setDemand(+e.target.value)}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Bassa (10%)</span><span>Alta (95%)</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Priority fee (mancia): <span className="text-slate-800 dark:text-slate-200 font-medium">{priorityFee} gwei</span>
          </label>
          <input
            type="range" min={0} max={10} step={0.5} value={priorityFee}
            onChange={(e) => setPriorityFee(+e.target.value)}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0 gwei</span><span>10 gwei</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="totalFeeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="block" tick={{ fontSize: 11 }}
            label={{ value: 'Blocco', position: 'insideBottom', offset: -2, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'Gwei', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              `${v.toFixed(1)} gwei`,
              name === 'baseFee' ? 'Base fee' : 'Fee totale',
            ]}
            labelFormatter={(l) => `Blocco ${l}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <ReferenceLine
            y={INITIAL_BASE_FEE}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: 'base iniziale', position: 'right', fontSize: 10, fill: '#94a3b8' }}
          />
          <Area
            type="monotone" dataKey="totalFee"
            fill="url(#totalFeeGrad)" stroke="#3b82f6" strokeWidth={1.5}
            name="totalFee" dot={false}
          />
          <Line
            type="monotone" dataKey="baseFee"
            stroke="#f59e0b" strokeWidth={2.5}
            name="baseFee" dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Base fee attuale</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{lastBaseFee.toFixed(1)} <span className="text-xs font-normal">gwei</span></div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Fee totale</div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{(lastBaseFee + priorityFee).toFixed(1)} <span className="text-xs font-normal">gwei</span></div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">ETH bruciato (sim)</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{burned.toFixed(0)} <span className="text-xs font-normal">gwei</span></div>
        </div>
      </div>
    </div>
  )
}
