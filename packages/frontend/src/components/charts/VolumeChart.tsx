import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { DayData } from '../../types.ts'

interface Props {
  dayDatas: DayData[]   // ultimi 30gg
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export default function VolumeChart({ dayDatas }: Props) {
  const data = [...dayDatas].reverse().map((d) => ({
    label:     formatDate(d.date),
    volumeUSD: parseFloat(d.volumeUSD),
    txCount:   parseInt(d.txCount, 10),
  }))

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Volume + Transazioni (30gg)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          {/* Asse sinistro: volume */}
          <YAxis
            yAxisId="volume"
            tickFormatter={formatUsd}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          {/* Asse destro: txCount */}
          <YAxis
            yAxisId="tx"
            orientation="right"
            tickFormatter={(v) => v.toLocaleString()}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number, name: string) =>
              name === 'volumeUSD'
                ? [formatUsd(value), 'Volume']
                : [value.toLocaleString(), 'Transazioni']
            }
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 11 }}>
                {value === 'volumeUSD' ? 'Volume USD' : 'Transazioni'}
              </span>
            )}
          />
          <Bar
            yAxisId="volume"
            dataKey="volumeUSD"
            fill="#6366f1"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="tx"
            type="monotone"
            dataKey="txCount"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
