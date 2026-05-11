import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Legend,
} from 'recharts'
import type { ILPerStrategy } from '../../types.ts'

interface Props {
  strategies:         ILPerStrategy[]
  selectedStrategyId: string
  onStrategyChange:   (id: string) => void
  currentPrice?:      number
  token0?:            string
  token1?:            string
}

const STRATEGY_COLORS: Record<string, string> = {
  'passive':        '#94a3b8',
  'narrow':         '#6366f1',
  'asymmetric-up':  '#10b981',
  'defensive':      '#f59e0b',
}

function fmtPct(v: number): string {
  return v > 0 ? `+${v.toFixed(0)}%` : `${v.toFixed(0)}%`
}

function formatRange(min: number, max: number): string {
  const minStr = min <= -99 ? '−∞' : `${min > 0 ? '+' : ''}${min}%`
  const maxStr = max >= 899 ? '+∞' : `+${max}%`
  return `[${minStr}, ${maxStr}]`
}

type HorizonDays = 30 | 60 | 90
const HORIZONS: HorizonDays[] = [30, 60, 90]

export default function ILSimulator({
  strategies,
  selectedStrategyId,
  onStrategyChange,
  currentPrice,
  token0 = 'token0',
  token1 = 'token1',
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const [horizonDays, setHorizonDays] = useState<HorizonDays>(30)

  if (strategies.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Caricamento dati IL…
      </div>
    )
  }

  const selected = strategies.find((s) => s.strategyId === selectedStrategyId) ?? strategies[0]

  // Net Return = IL + fees accumulate. Fee = 0 quando il prezzo è fuori range (V3 concentrato).
  const feesEarnedPercent = (inRange: boolean) =>
    inRange ? selected.currentFeeAPR * (horizonDays / 365) : 0

  const chartData = strategies[0].points.map((p, i) => {
    const row: Record<string, number | string> = {
      xLabel: fmtPct(p.priceChangePercent),
    }
    for (const s of strategies) {
      row[s.strategyId + '_il']   = s.points[i].ilPercent
      row[s.strategyId + '_days'] = s.points[i].feeOffsetDays === -1 ? 0 : s.points[i].feeOffsetDays
    }
    const selPoint = selected.points[i]
    row['net_return'] = parseFloat((selPoint.ilPercent + feesEarnedPercent(selPoint.inRange)).toFixed(2))
    return row
  })

  const selPoints = selected.points
  const leftOutIdx  = selPoints.findIndex((p) => !p.inRange && p.priceChangePercent < 0)
  const rightOutIdx = [...selPoints].reverse().findIndex((p) => !p.inRange && p.priceChangePercent > 0)
  const lastIdx     = selPoints.length - 1

  const leftOutLabel  = leftOutIdx  >= 0 ? fmtPct(selPoints[leftOutIdx].priceChangePercent)                  : null
  const rightOutLabel = rightOutIdx >= 0 ? fmtPct(selPoints[lastIdx - rightOutIdx].priceChangePercent) : null

  const visibleStrategies = showAll ? strategies : [selected]

  return (
    <div className="space-y-5">
      {/* Intestazione + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-slate-600">Curva IL + Net Return per Strategia</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Orizzonte fee:</span>
          {HORIZONS.map((d) => (
            <button
              key={d}
              onClick={() => setHorizonDays(d)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                horizonDays === d
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'
              }`}
            >
              {d}gg
            </button>
          ))}
          <button
            onClick={() => setShowAll((v) => !v)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              showAll
                ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'
            }`}
          >
            {showAll ? '▤ Tutte sovrapposte' : '— Solo selezionata'}
          </button>
        </div>
      </div>

      {/* Selettore strategia */}
      <div className="flex gap-2 flex-wrap">
        {strategies.map((s) => (
          <button
            key={s.strategyId}
            onClick={() => onStrategyChange(s.strategyId)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              s.strategyId === selectedStrategyId ? 'text-white' : 'border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            style={s.strategyId === selectedStrategyId
              ? { backgroundColor: STRATEGY_COLORS[s.strategyId] + '22', borderColor: STRATEGY_COLORS[s.strategyId] }
              : {}
            }
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STRATEGY_COLORS[s.strategyId] }} />
            {s.strategyName}
            <span className="text-slate-400 ml-0.5 font-mono">{formatRange(s.rangeMinPercent, s.rangeMaxPercent)}</span>
          </button>
        ))}
      </div>

      {/* Legenda curve */}
      <div className="flex items-center gap-4 flex-wrap text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5" style={{ backgroundColor: STRATEGY_COLORS[selected.strategyId] }} />
          <span className="text-slate-600">IL puro</span>
          <span className="text-slate-400">(perdita vs HODL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-emerald-500" />
          <span className="text-slate-600">Net Return {horizonDays}gg</span>
          <span className="text-slate-400">(IL + fee accumulate)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-blue-400" />
          <span className="text-slate-600">Recovery</span>
          <span className="text-slate-400">(gg per pareggiare IL, asse dx)</span>
        </div>
      </div>

      {/* Grafico */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis dataKey="xLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />

          <YAxis
            yAxisId="left"
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fill: '#ef4444', fontSize: 10 }}
            tickLine={false} axisLine={false} width={52}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => `${v.toFixed(0)}gg`}
            tick={{ fill: '#60a5fa', fontSize: 10 }}
            tickLine={false} axisLine={false} width={44}
          />

          {leftOutLabel && (
            <ReferenceArea
              yAxisId="left"
              x1={chartData[0].xLabel as string}
              x2={leftOutLabel}
              fill="#f1f5f9" fillOpacity={0.8}
              label={{ value: 'fuori range', fill: '#94a3b8', fontSize: 9, position: 'insideTop' }}
            />
          )}
          {rightOutLabel && (
            <ReferenceArea
              yAxisId="left"
              x1={rightOutLabel}
              x2={chartData[chartData.length - 1].xLabel as string}
              fill="#f1f5f9" fillOpacity={0.8}
              label={{ value: 'fuori range', fill: '#94a3b8', fontSize: 9, position: 'insideTop' }}
            />
          )}

          <ReferenceLine
            yAxisId="left" x="0%"
            stroke="#cbd5e1" strokeDasharray="4 4"
            label={{ value: 'attuale', fill: '#94a3b8', fontSize: 9, position: 'top' }}
          />

          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
            labelStyle={{ color: '#64748b', fontSize: 11 }}
            formatter={(value: number, name: string) => {
              if (name === 'net_return') {
                return [`${value.toFixed(2)}%`, `Net Return ${horizonDays}gg — ${selected.strategyName}`]
              }
              if ((name as string).endsWith('_il')) {
                const id = (name as string).replace('_il', '')
                const s = strategies.find((x) => x.strategyId === id)
                return [`${value.toFixed(2)}%`, `IL — ${s?.strategyName ?? id}`]
              }
              return [`${value.toFixed(0)} giorni`, 'Fee per coprire IL']
            }}
          />

          <Legend
            formatter={(value) => {
              if (value === 'net_return') {
                return <span style={{ color: '#10b981', fontSize: 10 }}>Net Return {horizonDays}gg</span>
              }
              const id = (value as string).replace(/_il$/, '').replace(/_days$/, '')
              const s = strategies.find((x) => x.strategyId === id)
              return <span style={{ color: '#64748b', fontSize: 10 }}>{s?.strategyName ?? id}</span>
            }}
          />

          {visibleStrategies.map((s) => (
            <Line
              key={s.strategyId + '_il'}
              yAxisId="left"
              type="monotone"
              dataKey={s.strategyId + '_il'}
              stroke={STRATEGY_COLORS[s.strategyId]}
              strokeWidth={s.strategyId === selectedStrategyId ? 2.5 : 1.5}
              strokeOpacity={!showAll || s.strategyId === selectedStrategyId ? 1 : 0.35}
              dot={false}
              activeDot={{ r: 4, fill: STRATEGY_COLORS[s.strategyId] }}
            />
          ))}

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="net_return"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#10b981' }}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey={selected.strategyId + '_days'}
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 3, fill: '#60a5fa' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Info sintetica strategia selezionata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-200 pt-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Range</p>
          <p className="text-sm font-medium text-slate-800 font-mono">
            {formatRange(selected.rangeMinPercent, selected.rangeMaxPercent)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Fee APR <span className="text-emerald-600 font-semibold">{selected.currentFeeAPR.toFixed(1)}%</span>
          </p>
        </div>

        {/* Card breakdown a +10% */}
        {(() => {
          const pt = selected.points.find((p) => Math.abs(p.priceMultiplier - 1.1) < 0.01)
          if (!pt) return <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-400">N/D</div>
          const fee = pt.inRange ? selected.currentFeeAPR * (horizonDays / 365) : 0
          const net = pt.ilPercent + fee
          return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">Scenario prezzo +10% ({horizonDays}gg)</p>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">IL</span>
                  <span className="text-red-500 font-semibold">{pt.ilPercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee {pt.inRange ? '' : '(fuori range)'}</span>
                  <span className="text-emerald-600 font-semibold">+{fee.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 mt-1">
                  <span className="text-slate-700 font-semibold">Net Return</span>
                  <span className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {net >= 0 ? '+' : ''}{net.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Card breakdown a -10% */}
        {(() => {
          const pt = selected.points.find((p) => Math.abs(p.priceMultiplier - 0.9) < 0.01)
          if (!pt) return <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-400">N/D</div>
          const fee = pt.inRange ? selected.currentFeeAPR * (horizonDays / 365) : 0
          const net = pt.ilPercent + fee
          return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">Scenario prezzo −10% ({horizonDays}gg)</p>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">IL</span>
                  <span className="text-red-500 font-semibold">{pt.ilPercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee {pt.inRange ? '' : '(fuori range)'}</span>
                  <span className="text-emerald-600 font-semibold">+{fee.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 mt-1">
                  <span className="text-slate-700 font-semibold">Net Return</span>
                  <span className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {net >= 0 ? '+' : ''}{net.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {currentPrice && (
        <p className="text-xs text-slate-400 text-right">
          Prezzo corrente: {currentPrice.toFixed(6)} {token0}/{token1}
        </p>
      )}
    </div>
  )
}
