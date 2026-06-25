import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { usePoolHistory } from '../../hooks/usePoolData.ts'

interface Props {
  chain:      string
  poolId:     string
  /** Quote token symbol (token1) — used to label the price axis. */
  quote:      string
  /** Position range bounds (in token1 per token0) to overlay on the price line. */
  priceLower: number
  priceUpper: number
  /** Current price (token1 per token0) — used to auto-orient the subgraph OHLC. */
  currentPrice: number
  days?:      number
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })
}

export default function PositionTrendChart({ chain, poolId, quote, priceLower, priceUpper, currentPrice, days = 30 }: Props) {
  const { data: history, isLoading, isError } = usePoolHistory(chain, poolId, days)

  if (isLoading) {
    return (
      <div className="h-[200px] rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-raised)' }} />
    )
  }

  if (isError || !history || history.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }}>
        Dati storici non disponibili per questa pool.
      </div>
    )
  }

  // The subgraph OHLC (`close`) is token0Price, which may be the inverse of the
  // card's price (priceAtTick → token1/token0). Auto-detect orientation by
  // comparing the most recent close against currentPrice and invert if needed.
  const lastClose = parseFloat(history[0].close)
  const invert =
    lastClose > 0 && currentPrice > 0 &&
    Math.abs(Math.log(1 / lastClose / currentPrice)) < Math.abs(Math.log(lastClose / currentPrice))
  const orient = (close: number) => (invert && close > 0 ? 1 / close : close)

  // Subgraph returns most-recent-first; chart reads left→right oldest→newest.
  const data = [...history].reverse().map((d) => ({
    label:     formatDate(d.date),
    price:     orient(parseFloat(d.close)),
    volumeUSD: parseFloat(d.volumeUSD),
    feesUSD:   parseFloat(d.feesUSD),
  }))

  // Only draw the range band if it falls within the plotted price window
  // (V3 ranges can be far outside the recent price, which would squash the axis).
  const prices    = data.map((d) => d.price)
  const priceMin  = Math.min(...prices)
  const priceMax  = Math.max(...prices)
  const showLower = priceLower >= priceMin * 0.5 && priceLower <= priceMax * 1.5
  const showUpper = priceUpper >= priceMin * 0.5 && priceUpper <= priceMax * 1.5

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        {/* Left axis: volume bars (USD) */}
        <YAxis
          yAxisId="usd"
          tickFormatter={formatUsd}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        {/* Right axis: price line */}
        <YAxis
          yAxisId="price"
          orientation="right"
          domain={['auto', 'auto']}
          tickFormatter={(v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          tick={{ fill: '#818cf8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        {/* Hidden axis: fees auto-scale to keep their (smaller) trend visible */}
        <YAxis yAxisId="fees" hide domain={['auto', 'auto']} />

        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#64748b' }}
          formatter={(value: number, name: string) => {
            if (name === 'price')   return [`${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${quote}`, 'Prezzo']
            if (name === 'feesUSD') return [formatUsd(value), 'Fee']
            return [formatUsd(value), 'Volume']
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#64748b', fontSize: 11 }}>
              {value === 'price' ? 'Prezzo' : value === 'feesUSD' ? 'Fee' : 'Volume'}
            </span>
          )}
        />

        {/* Position range band on the price axis */}
        {showLower && (
          <ReferenceLine yAxisId="price" y={priceLower} stroke="#cbd5e1" strokeDasharray="4 4" />
        )}
        {showUpper && (
          <ReferenceLine yAxisId="price" y={priceUpper} stroke="#cbd5e1" strokeDasharray="4 4" />
        )}

        <Bar  yAxisId="usd"   dataKey="volumeUSD" fill="#a5b4fc" opacity={0.7} radius={[2, 2, 0, 0]} />
        <Line yAxisId="fees"  type="monotone" dataKey="feesUSD" stroke="#34d399" strokeWidth={2} dot={false} />
        <Line yAxisId="price" type="monotone" dataKey="price"   stroke="#6366f1" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
