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
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function BacktestChart({ results, selectedStrategyId, onStrategyChange }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)

  if (results.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Dati backtesting non disponibili (richiede storico in DuckDB).
      </div>
    )
  }

  const periodResults = results.filter((r) => r.periodDays === period)

  const chartData = periodResults.map((r) => ({
    name:      STRATEGY_NAMES[r.strategyId] ?? r.strategyId,
    strategyId: r.strategyId,
    fees:      parseFloat((r.totalFeesUSD).toFixed(2)),
    il:        parseFloat((r.totalILPercent).toFixed(2)),
    pnl:       parseFloat((r.netPnlPercent).toFixed(2)),
    hodl:      parseFloat((r.hodlReturnPercent).toFixed(2)),
    inRange:   r.timeInRangePercent,
  }))

  const selectedResult = periodResults.find((r) => r.strategyId === selectedStrategyId)

  const warnings = periodResults
    .filter((r) => r.rebalancingWarning)
    .map((r) => ({ name: STRATEGY_NAMES[r.strategyId], warning: r.rebalancingWarning! }))

  return (
    <div className="space-y-5">
      {/* Header + selettori */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-slate-600">Backtesting Storico (dati reali)</h3>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  period === p
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-300'
                    : 'text-slate-400 border border-slate-200 hover:text-slate-600'
                }`}
              >
                {p}gg
              </button>
            ))}
          </div>
          <select
            value={selectedStrategyId}
            onChange={(e) => onStrategyChange(e.target.value)}
            className="text-xs bg-white border border-slate-200 text-slate-600 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
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
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-amber-700">
                <span className="font-medium">{w.name}:</span> {w.warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Grafico comparativo */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
          <YAxis
            yAxisId="pct"
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false} axisLine={false} width={44}
          />
          <YAxis
            yAxisId="usd"
            orientation="right"
            tickFormatter={formatUsd}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false} axisLine={false} width={52}
          />

          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
            labelStyle={{ color: '#64748b', fontSize: 11 }}
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
              return <span style={{ color: '#64748b', fontSize: 10 }}>{labels[value as string] ?? value}</span>
            }}
          />

          <ReferenceLine yAxisId="pct" y={0} stroke="#e2e8f0" />

          {/* Fee (barre verdi, asse USD) */}
          <Bar yAxisId="usd" dataKey="fees" fill="#6ee7b7" fillOpacity={0.7} radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.strategyId}
                fill="#6ee7b7"
                fillOpacity={entry.strategyId === selectedStrategyId ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* IL (barre rosse, asse %) */}
          <Bar yAxisId="pct" dataKey="il" fill="#fca5a5" fillOpacity={0.7} radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.strategyId}
                fill="#fca5a5"
                fillOpacity={entry.strategyId === selectedStrategyId ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* PnL netto (linea scura) */}
          <Line
            yAxisId="pct" type="monotone" dataKey="pnl"
            stroke="#334155" strokeWidth={2}
            dot={{ fill: '#334155', r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* HODL (linea slate tratteggiata) */}
          <Line
            yAxisId="pct" type="monotone" dataKey="hodl"
            stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3"
            dot={false} activeDot={{ r: 3, fill: '#94a3b8' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Metriche della strategia selezionata */}
      {selectedResult && (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-400 mb-3">
            Dettaglio — <span className="text-slate-700">{STRATEGY_NAMES[selectedResult.strategyId]}</span> · {period}gg
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Fee accumulate"
              value={formatUsd(selectedResult.totalFeesUSD)}
              color="text-emerald-600"
            />
            <MetricCard
              label="Impermanent Loss"
              value={`${selectedResult.totalILPercent.toFixed(2)}%`}
              color={selectedResult.totalILPercent < -1 ? 'text-red-500' : 'text-slate-600'}
            />
            <MetricCard
              label="PnL netto"
              value={`${selectedResult.netPnlPercent > 0 ? '+' : ''}${selectedResult.netPnlPercent.toFixed(2)}%`}
              color={selectedResult.netPnlPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <MetricCard
              label="Tempo in range"
              value={`${selectedResult.timeInRangePercent.toFixed(1)}%`}
              color={selectedResult.timeInRangePercent >= 70 ? 'text-emerald-600' : selectedResult.timeInRangePercent >= 50 ? 'text-amber-500' : 'text-red-500'}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <MetricCard
              label="HODL benchmark"
              value={`${selectedResult.hodlReturnPercent > 0 ? '+' : ''}${selectedResult.hodlReturnPercent.toFixed(2)}%`}
              color="text-slate-500"
            />
            <MetricCard
              label="Riposizionamenti"
              value={String(selectedResult.rebalancingCount)}
              color={selectedResult.rebalancingCount > 2 ? 'text-amber-500' : 'text-slate-600'}
            />
            <MetricCard
              label="Costo gas stimato"
              value={formatUsd(selectedResult.totalGasCostEstimateUSD)}
              color="text-slate-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
