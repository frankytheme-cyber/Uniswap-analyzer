import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import type { BacktestResult } from '../../types.ts'

interface Props {
  results:            BacktestResult[]
  selectedStrategyId: string
  onStrategyChange:   (id: string) => void
}

const PERIODS = [7, 30, 90] as const

const STRATEGY_NAMES: Record<string, string> = {
  'passive':        'Full Range',
  'narrow':         'Stretto',
  'asymmetric-up':  'Rialzista',
  'defensive':      'Difensiva',
}

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function BacktestChart({ results, selectedStrategyId, onStrategyChange }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)

  if (results.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        Dati backtesting non disponibili (richiede storico in DuckDB).
      </div>
    )
  }

  // Filtra i risultati per il periodo selezionato
  const periodResults = results.filter((r) => r.periodDays === period)

  // Costruisce i dati grafico: una barra per strategia
  const chartData = periodResults.map((r) => ({
    name:      STRATEGY_NAMES[r.strategyId] ?? r.strategyId,
    strategyId: r.strategyId,
    fees:      parseFloat((r.totalFeesUSD).toFixed(2)),
    il:        parseFloat((r.totalILPercent).toFixed(2)),        // negativo
    pnl:       parseFloat((r.netPnlPercent).toFixed(2)),
    hodl:      parseFloat((r.hodlReturnPercent).toFixed(2)),
    inRange:   r.timeInRangePercent,
  }))

  // Dati della strategia selezionata nel periodo corrente
  const selectedResult = periodResults.find((r) => r.strategyId === selectedStrategyId)

  // Warning da qualsiasi strategia nel periodo
  const warnings = periodResults
    .filter((r) => r.rebalancingWarning)
    .map((r) => ({ name: STRATEGY_NAMES[r.strategyId], warning: r.rebalancingWarning! }))

  return (
    <div className="space-y-5">
      {/* Header + selettori */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-gray-400">Backtesting Storico (dati reali)</h3>
        <div className="flex gap-2 flex-wrap">
          {/* Periodo */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  period === p
                    ? 'bg-indigo-900 text-indigo-300 border border-indigo-600'
                    : 'text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                {p}gg
              </button>
            ))}
          </div>
          {/* Strategia */}
          <select
            value={selectedStrategyId}
            onChange={(e) => onStrategyChange(e.target.value)}
            className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            {Object.entries(STRATEGY_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Warning rebalancing */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-950 border border-amber-700 rounded-lg px-3 py-2">
              <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-amber-300">
                <span className="font-medium">{w.name}:</span> {w.warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Grafico comparativo (tutte le strategie nel periodo) */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />
          <YAxis
            yAxisId="pct"
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false} axisLine={false} width={44}
          />
          <YAxis
            yAxisId="usd"
            orientation="right"
            tickFormatter={formatUsd}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false} axisLine={false} width={52}
          />

          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number, name: string) => {
              if (name === 'fees')  return [formatUsd(value), 'Fee accumulate']
              if (name === 'il')    return [`${value.toFixed(2)}%`, 'IL totale']
              if (name === 'pnl')   return [`${value.toFixed(2)}%`, 'PnL netto']
              if (name === 'hodl')  return [`${value.toFixed(2)}%`, 'HODL benchmark']
              if (name === 'inRange') return [`${value.toFixed(1)}%`, 'Tempo in range']
              return [value, name]
            }}
          />

          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                fees:    'Fee ($)',
                il:      'IL (%)',
                pnl:     'PnL netto (%)',
                hodl:    'HODL (%)',
                inRange: 'In range (%)',
              }
              return <span style={{ color: '#9ca3af', fontSize: 10 }}>{labels[value as string] ?? value}</span>
            }}
          />

          <ReferenceLine yAxisId="pct" y={0} stroke="#374151" />

          {/* Fee (barre verdi, asse USD) */}
          <Bar yAxisId="usd" dataKey="fees" fill="#22c55e" fillOpacity={0.7} radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.strategyId}
                fill="#22c55e"
                fillOpacity={entry.strategyId === selectedStrategyId ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* IL (barre rosse, asse %) */}
          <Bar yAxisId="pct" dataKey="il" fill="#ef4444" fillOpacity={0.7} radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.strategyId}
                fill="#ef4444"
                fillOpacity={entry.strategyId === selectedStrategyId ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* PnL netto (linea bianca) */}
          <Line
            yAxisId="pct" type="monotone" dataKey="pnl"
            stroke="#f9fafb" strokeWidth={2}
            dot={{ fill: '#f9fafb', r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* HODL (linea grigia tratteggiata — benchmark) */}
          <Line
            yAxisId="pct" type="monotone" dataKey="hodl"
            stroke="#6b7280" strokeWidth={1.5} strokeDasharray="6 3"
            dot={false} activeDot={{ r: 3, fill: '#6b7280' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Metriche della strategia selezionata */}
      {selectedResult && (
        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-3">
            Dettaglio — <span className="text-gray-300">{STRATEGY_NAMES[selectedResult.strategyId]}</span> · {period}gg
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Fee accumulate"
              value={formatUsd(selectedResult.totalFeesUSD)}
              color="text-green-400"
            />
            <MetricCard
              label="Impermanent Loss"
              value={`${selectedResult.totalILPercent.toFixed(2)}%`}
              color={selectedResult.totalILPercent < -1 ? 'text-red-400' : 'text-gray-300'}
            />
            <MetricCard
              label="PnL netto"
              value={`${selectedResult.netPnlPercent > 0 ? '+' : ''}${selectedResult.netPnlPercent.toFixed(2)}%`}
              color={selectedResult.netPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <MetricCard
              label="Tempo in range"
              value={`${selectedResult.timeInRangePercent.toFixed(1)}%`}
              color={selectedResult.timeInRangePercent >= 70 ? 'text-green-400' : selectedResult.timeInRangePercent >= 50 ? 'text-amber-400' : 'text-red-400'}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <MetricCard
              label="HODL benchmark"
              value={`${selectedResult.hodlReturnPercent > 0 ? '+' : ''}${selectedResult.hodlReturnPercent.toFixed(2)}%`}
              color="text-gray-400"
            />
            <MetricCard
              label="Riposizionamenti"
              value={String(selectedResult.rebalancingCount)}
              color={selectedResult.rebalancingCount > 2 ? 'text-amber-400' : 'text-gray-300'}
            />
            <MetricCard
              label="Costo gas stimato"
              value={formatUsd(selectedResult.totalGasCostEstimateUSD)}
              color="text-gray-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
