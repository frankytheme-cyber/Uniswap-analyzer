import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { DayData } from '../../types.ts'

interface Props {
  dayDatas: DayData[]
  avlRatio: number
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
  const data = [...dayDatas].reverse().map((d) => {
    const tvl = parseFloat(d.tvlUSD)
    return {
      date:        d.date,
      label:       formatDate(d.date),
      tvlUSD:      tvl,
      avlUSD:      tvl * avlRatio,
      inactiveLiq: tvl * (1 - avlRatio),
    }
  })

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-600 mb-3">TVL vs Liquidità Attiva (90gg)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="avl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="tvl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#cbd5e1" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatUsd}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#64748b' }}
            formatter={(value: number, name: string) => [
              formatUsd(value),
              name === 'avlUSD' ? 'Liquidità Attiva' : 'TVL Totale',
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {value === 'avlUSD' ? 'Liquidità Attiva (AVL)' : 'TVL Totale'}
              </span>
            )}
          />
          <Area type="monotone" dataKey="tvlUSD" stroke="#cbd5e1" fill="url(#tvl)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="avlUSD" stroke="#818cf8" fill="url(#avl)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
