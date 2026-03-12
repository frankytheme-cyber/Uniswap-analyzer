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
  'passive':        '#6b7280',
  'narrow':         '#6366f1',
  'asymmetric-up':  '#22c55e',
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

export default function ILSimulator({
  strategies,
  selectedStrategyId,
  onStrategyChange,
  currentPrice,
  token0 = 'token0',
  token1 = 'token1',
}: Props) {
  const [showAll, setShowAll] = useState(false)

  if (strategies.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        Caricamento dati IL…
      </div>
    )
  }

  const selected = strategies.find((s) => s.strategyId === selectedStrategyId) ?? strategies[0]

  // Costruisci dati grafico allineando i punti per indice (stessi price multipliers)
  const chartData = strategies[0].points.map((p, i) => {
    const row: Record<string, number | string> = {
      xLabel: fmtPct(p.priceChangePercent),
    }
    for (const s of strategies) {
      row[s.strategyId + '_il']   = s.points[i].ilPercent
      row[s.strategyId + '_days'] = s.points[i].feeOffsetDays === -1 ? 0 : s.points[i].feeOffsetDays
    }
    return row
  })

  // Zona out-of-range della strategia selezionata (per la ReferenceArea)
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
        <h3 className="text-sm font-medium text-gray-400">Curva Impermanent Loss per Strategia</h3>
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            showAll
              ? 'bg-indigo-900 border-indigo-600 text-indigo-300'
              : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
          }`}
        >
          {showAll ? '▤ Tutte sovrapposte' : '— Solo selezionata'}
        </button>
      </div>

      {/* Selettore strategia */}
      <div className="flex gap-2 flex-wrap">
        {strategies.map((s) => (
          <button
            key={s.strategyId}
            onClick={() => onStrategyChange(s.strategyId)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              s.strategyId === selectedStrategyId ? 'text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
            style={s.strategyId === selectedStrategyId
              ? { backgroundColor: STRATEGY_COLORS[s.strategyId] + '22', borderColor: STRATEGY_COLORS[s.strategyId] }
              : {}
            }
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STRATEGY_COLORS[s.strategyId] }} />
            {s.strategyName}
            <span className="text-gray-600 ml-0.5 font-mono">{formatRange(s.rangeMinPercent, s.rangeMaxPercent)}</span>
          </button>
        ))}
      </div>

      {/* Grafico */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

          <XAxis dataKey="xLabel" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />

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

          {/* Area grigia out-of-range della strategia selezionata */}
          {leftOutLabel && (
            <ReferenceArea
              yAxisId="left"
              x1={chartData[0].xLabel as string}
              x2={leftOutLabel}
              fill="#374151" fillOpacity={0.25}
              label={{ value: 'fuori range', fill: '#4b5563', fontSize: 9, position: 'insideTop' }}
            />
          )}
          {rightOutLabel && (
            <ReferenceArea
              yAxisId="left"
              x1={rightOutLabel}
              x2={chartData[chartData.length - 1].xLabel as string}
              fill="#374151" fillOpacity={0.25}
              label={{ value: 'fuori range', fill: '#4b5563', fontSize: 9, position: 'insideTop' }}
            />
          )}

          <ReferenceLine
            yAxisId="left" x="0%"
            stroke="#4b5563" strokeDasharray="4 4"
            label={{ value: 'attuale', fill: '#4b5563', fontSize: 9, position: 'top' }}
          />

          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number, name: string) => {
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
              const id = (value as string).replace(/_il$/, '').replace(/_days$/, '')
              const s = strategies.find((x) => x.strategyId === id)
              return <span style={{ color: '#9ca3af', fontSize: 10 }}>{s?.strategyName ?? id}</span>
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

          {/* Fee offset days solo per la strategia selezionata */}
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
      <div className="grid grid-cols-3 gap-3 border-t border-gray-800 pt-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Range</p>
          <p className="text-sm font-medium text-white font-mono">
            {formatRange(selected.rangeMinPercent, selected.rangeMaxPercent)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Fee APR corrente</p>
          <p className="text-sm font-bold text-green-400">{selected.currentFeeAPR.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">IL a ±10%</p>
          {(() => {
            const pt = selected.points.find((p) => Math.abs(p.priceMultiplier - 1.1) < 0.01)
            return pt
              ? <p className="text-sm font-bold text-red-400">{pt.ilPercent.toFixed(2)}%</p>
              : <p className="text-sm text-gray-600">N/D</p>
          })()}
        </div>
      </div>

      {currentPrice && (
        <p className="text-xs text-gray-600 text-right">
          Prezzo corrente: {currentPrice.toFixed(6)} {token0}/{token1}
        </p>
      )}
    </div>
  )
}
