import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { DayData } from '../../types.ts'

interface Props {
  dayDatas: DayData[]
  avlRatio: number     // da analysis.parameters.find(p => p.id === 'tvl').value
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export default function TVLChart({ dayDatas, avlRatio }: Props) {
  // dayDatas è desc → invertiamo per ordine cronologico
  const data = [...dayDatas].reverse().map((d) => {
    const tvl = parseFloat(d.tvlUSD)
    return {
      date:         d.date,
      label:        formatDate(d.date),
      tvlUSD:       tvl,
      avlUSD:       tvl * avlRatio,
      inactiveLiq:  tvl * (1 - avlRatio),
    }
  })

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">TVL vs Liquidità Attiva (90gg)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="avl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="tvl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#374151" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#374151" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatUsd}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number, name: string) => [
              formatUsd(value),
              name === 'avlUSD' ? 'Liquidità Attiva' : 'TVL Totale',
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 11 }}>
                {value === 'avlUSD' ? 'Liquidità Attiva (AVL)' : 'TVL Totale'}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="tvlUSD"
            stroke="#374151"
            fill="url(#tvl)"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="avlUSD"
            stroke="#6366f1"
            fill="url(#avl)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
