import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { Tick } from '../../types.ts'

interface Props {
  ticks:       Tick[]
  currentTick: number
  buckets?:    number    // numero di bucket (default 30)
}

interface Bucket {
  label:         string
  liquidityGross: number
  tickMid:       number
  isActive:      boolean
}

const VISIBLE_RANGE = 8000   // tick visibili attorno al currentTick

function buildBuckets(ticks: Tick[], currentTick: number, buckets: number): Bucket[] {
  const lower  = currentTick - VISIBLE_RANGE
  const upper  = currentTick + VISIBLE_RANGE
  const width  = (upper - lower) / buckets

  // Inizializza bucket
  const result: Bucket[] = Array.from({ length: buckets }, (_, i) => {
    const tickLow  = lower + i * width
    const tickMid  = tickLow + width / 2
    return {
      label:          tickLow >= 0 ? `+${Math.round(tickLow / 100)}` : `${Math.round(tickLow / 100)}`,
      liquidityGross: 0,
      tickMid,
      isActive:       tickMid >= currentTick - width && tickMid <= currentTick + width,
    }
  })

  // Distribuisci liquidità nei bucket
  for (const tick of ticks) {
    const idx = parseInt(tick.tickIdx, 10)
    if (idx < lower || idx > upper) continue
    const bucketIdx = Math.min(Math.floor((idx - lower) / width), buckets - 1)
    result[bucketIdx].liquidityGross += parseFloat(tick.liquidityGross)
  }

  // Normalizza in unità leggibili (dividi per 1e12)
  const max = Math.max(...result.map((b) => b.liquidityGross))
  if (max > 0) {
    for (const b of result) {
      b.liquidityGross = b.liquidityGross / max * 100
    }
  }

  return result
}

export default function TickHeatmap({ ticks, currentTick, buckets = 30 }: Props) {
  if (ticks.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Distribuzione Liquidità per Tick</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
          Nessun dato tick disponibile
        </div>
      </div>
    )
  }

  const data = buildBuckets(ticks, currentTick, buckets)

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Distribuzione Liquidità per Tick
        <span className="ml-2 text-xs text-gray-600">(tick corrente = 0)</span>
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 9 }}
            tickLine={false}
            interval={Math.floor(buckets / 6)}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Liquidità relativa']}
          />
          {/* Linea tick corrente */}
          <ReferenceLine
            x={data[Math.floor(buckets / 2)]?.label}
            stroke="#6366f1"
            strokeWidth={2}
            label={{ value: 'Prezzo', fill: '#6366f1', fontSize: 10, position: 'top' }}
          />
          <Bar dataKey="liquidityGross" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isActive ? '#6366f1' : '#374151'}
                opacity={entry.isActive ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
