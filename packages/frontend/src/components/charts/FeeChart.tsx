import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { DayData } from '../../types.ts'

interface Props {
  dayDatas: DayData[]   // ultimi 365gg
}

const WINDOW = 30   // rolling window per APR

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })
}

/** Calcola rolling feeAPR su una finestra di WINDOW giorni */
function buildChartData(dayDatas: DayData[]) {
  const chronological = [...dayDatas].reverse()

  return chronological.map((d, i) => {
    const windowStart = Math.max(0, i - WINDOW + 1)
    const slice       = chronological.slice(windowStart, i + 1)
    const n           = slice.length

    const totalFees = slice.reduce((s, x) => s + parseFloat(x.feesUSD), 0)
    const avgTvl    = slice.reduce((s, x) => s + parseFloat(x.tvlUSD), 0) / n
    const rollingApr = avgTvl > 0 ? (totalFees / avgTvl) * (365 / n) * 100 : 0

    return {
      label:      formatDate(d.date),
      feeAPR:     parseFloat(rollingApr.toFixed(2)),
      feesUSD:    parseFloat(d.feesUSD),
    }
  })
}

export default function FeeChart({ dayDatas }: Props) {
  const data = buildChartData(dayDatas)

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Fee APR rolling {WINDOW}gg (365gg)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, `Fee APR (${WINDOW}gg)`]}
          />
          {/* Soglia "buona" */}
          <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
          {/* Soglia "minima" */}
          <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="feeAPR"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 border-t border-dashed border-green-500" />
          Soglia buona (20%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 border-t border-dashed border-amber-500" />
          Soglia minima (10%)
        </span>
      </div>
    </div>
  )
}
