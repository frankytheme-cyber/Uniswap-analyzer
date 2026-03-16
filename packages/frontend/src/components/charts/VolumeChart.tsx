import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { DayData } from '../../types.ts'

interface Props {
  dayDatas: DayData[]
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
      <h3 className="text-sm font-medium text-slate-600 mb-3">Volume + Transazioni (30gg)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="volume"
            tickFormatter={formatUsd}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <YAxis
            yAxisId="tx"
            orientation="right"
            tickFormatter={(v) => v.toLocaleString()}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#64748b' }}
            formatter={(value: number, name: string) =>
              name === 'volumeUSD'
                ? [formatUsd(value), 'Volume']
                : [value.toLocaleString(), 'Transazioni']
            }
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {value === 'volumeUSD' ? 'Volume USD' : 'Transazioni'}
              </span>
            )}
          />
          {/* Pastel indigo bars */}
          <Bar yAxisId="volume" dataKey="volumeUSD" fill="#a5b4fc" opacity={0.85} radius={[2, 2, 0, 0]} />
          {/* Pastel amber line */}
          <Line yAxisId="tx" type="monotone" dataKey="txCount" stroke="#fcd34d" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
