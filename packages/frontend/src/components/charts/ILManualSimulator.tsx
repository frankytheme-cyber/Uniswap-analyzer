import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'

// ── Formula V3 (stessa del backend, pura matematica) ──────────────────────────

interface V3ILResult {
  ilPercent:  number
  inRange:    boolean
  token0Pct:  number
  token1Pct:  number
}

function calcV3IL(r: number, rangeMinPct: number, rangeMaxPct: number): V3ILResult {
  const a = rangeMinPct <= -99 ? 0.000001 : Math.max(1 + rangeMinPct / 100, 0.000001)
  const b = rangeMaxPct >= 899 ? 1_000_000 : 1 + rangeMaxPct / 100

  const sqrtR = Math.sqrt(r)
  const sqrtA = Math.sqrt(a)
  const sqrtB = Math.sqrt(b)
  const vHold = r * (1 - 1 / sqrtB) + (1 - sqrtA)

  let ilPercent: number
  let inRange: boolean
  let token0Pct: number
  let token1Pct: number

  if (sqrtR <= sqrtA) {
    ilPercent = vHold > 0 ? ((1 / sqrtA - 1 / sqrtB) * r / vHold - 1) * 100 : 0
    inRange = false
    token0Pct = 100
    token1Pct = 0
  } else if (sqrtR >= sqrtB) {
    ilPercent = vHold > 0 ? ((sqrtB - sqrtA) / vHold - 1) * 100 : 0
    inRange = false
    token0Pct = 0
    token1Pct = 100
  } else {
    ilPercent = vHold > 0 ? ((2 * sqrtR - sqrtA - r / sqrtB) / vHold - 1) * 100 : 0
    inRange = true
    const xVal = (1 / sqrtR - 1 / sqrtB) * r
    const yVal = sqrtR - sqrtA
    const total = xVal + yVal
    token0Pct = total > 0 ? Math.round((xVal / total) * 100) : 50
    token1Pct = 100 - token0Pct
  }

  return { ilPercent: parseFloat(ilPercent.toFixed(2)), inRange, token0Pct, token1Pct }
}

// 60 punti per una curva fluida
const CHART_MULTIPLIERS = Array.from({ length: 60 }, (_, i) =>
  parseFloat((0.1 + (i * (10 - 0.1)) / 59).toFixed(4)),
)

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialFeeAPR?:   number    // da useILSimulatorData
  currentPrice?:    number    // prezzo pool: rapporto token0/token1 (es. 3000 per ETH/USDC)
  token0?:          string
  token1?:          string
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function PriceInput({
  label, value, onChange, color = 'indigo',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color?: 'indigo' | 'emerald'
}) {
  const ring = color === 'emerald' ? 'focus:border-emerald-500 focus:ring-emerald-500' : 'focus:border-indigo-500 focus:ring-indigo-500'
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        step="any"
        min="0"
        className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:ring-1 ${ring}`}
      />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ILManualSimulator({
  initialFeeAPR = 0,
  currentPrice,
  token0 = 'token0',
  token1 = 'token1',
}: Props) {
  const [rangeMin, setRangeMin] = useState(-20)
  const [rangeMax, setRangeMax] = useState(20)
  const [feeAPR,   setFeeAPR]   = useState(initialFeeAPR)

  // Prezzi entry (in una valuta comune, es. USD)
  const [token0EntryUSD, setToken0EntryUSD] = useState(currentPrice ?? 0)
  const [token1EntryUSD, setToken1EntryUSD] = useState(1)

  // Prezzi simulati
  const [token0SimUSD, setToken0SimUSD] = useState(currentPrice ?? 0)
  const [token1SimUSD, setToken1SimUSD] = useState(1)

  const priceInit = useRef(false)
  const feeInit   = useRef(false)

  // Inizializza i prezzi una sola volta quando currentPrice arriva dal backend.
  // currentPrice = token0Price (prezzo di token0 in token1 dal subgraph).
  // Se token0 è uno stablecoin (es. USDC/WETH pool), close ≈ 0.000333 → invertire.
  const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'LUSD', 'CRVUSD', 'USDE', 'PYUSD'])

  useEffect(() => {
    if (!priceInit.current && currentPrice && currentPrice > 0) {
      const t0Stable = STABLECOINS.has(token0.toUpperCase())
      const t1Stable = STABLECOINS.has(token1.toUpperCase())

      // close = token0Price dal subgraph = quantità di token0 per 1 token1
      if (t0Stable && !t1Stable) {
        // token0=USDC, token1=ETH: close = USDC per ETH ≈ 2000 (= prezzo ETH in USD)
        setToken0EntryUSD(1)
        setToken0SimUSD(1)
        setToken1EntryUSD(currentPrice)
        setToken1SimUSD(currentPrice)
      } else if (!t0Stable && t1Stable) {
        // token0=ETH, token1=USDC: close = ETH per USDC ≈ 0.000487 → prezzo ETH = 1/close
        const token0Price = parseFloat((1 / currentPrice).toFixed(4))
        setToken0EntryUSD(token0Price)
        setToken0SimUSD(token0Price)
        setToken1EntryUSD(1)
        setToken1SimUSD(1)
      } else {
        // Entrambi volatili: usa il ratio grezzo (token0=close, token1=1)
        setToken0EntryUSD(currentPrice)
        setToken0SimUSD(currentPrice)
      }
      priceInit.current = true
    }
  }, [currentPrice, token0, token1])

  // Inizializza il fee APR una sola volta quando arriva dal backend
  useEffect(() => {
    if (!feeInit.current && initialFeeAPR > 0) {
      setFeeAPR(initialFeeAPR)
      feeInit.current = true
    }
  }, [initialFeeAPR])

  // ── Prezzi pool derivati ──────────────────────────────────────────────────
  const entryRatio = token1EntryUSD > 0 ? token0EntryUSD / token1EntryUSD : 0
  const simRatio   = token1SimUSD   > 0 ? token0SimUSD   / token1SimUSD   : 0
  const r          = entryRatio > 0 ? simRatio / entryRatio : 1

  const ratioPctChange = ((r - 1) * 100)
  const token0PctChange = token0EntryUSD > 0 ? ((token0SimUSD / token0EntryUSD - 1) * 100) : 0
  const token1PctChange = token1EntryUSD > 0 ? ((token1SimUSD / token1EntryUSD - 1) * 100) : 0

  // ── Dati grafico (curva IL completa) ─────────────────────────────────────
  const chartData = useMemo(() => {
    return CHART_MULTIPLIERS.map((mult) => {
      const { ilPercent, inRange } = calcV3IL(mult, rangeMin, rangeMax)
      const dailyFee = feeAPR / 365
      const feeOffsetDays = dailyFee > 0 && ilPercent < 0
        ? parseFloat((Math.abs(ilPercent) / dailyFee).toFixed(1))
        : null
      return {
        r: mult,
        xLabel:       `${((mult - 1) * 100).toFixed(0)}%`,
        ilPercent,
        feeOffsetDays,
        inRange,
      }
    })
  }, [rangeMin, rangeMax, feeAPR])

  // ── Punto al prezzo simulato ──────────────────────────────────────────────
  const simResult  = useMemo(() => calcV3IL(r, rangeMin, rangeMax), [r, rangeMin, rangeMax])
  const simIL      = simResult.ilPercent
  const simDailyFee = feeAPR / 365
  const simFeeOffset = simDailyFee > 0 && simIL < 0
    ? Math.abs(simIL) / simDailyFee
    : null

  // Zone out-of-range per ReferenceArea
  const priceMin    = rangeMin <= -99 ? null : (1 + rangeMin / 100)
  const priceMax    = rangeMax >= 899 ? null : (1 + rangeMax / 100)
  const leftCutPct  = priceMin != null ? `${((priceMin - 1) * 100).toFixed(0)}%` : null
  const rightCutPct = priceMax != null ? `${((priceMax - 1) * 100).toFixed(0)}%` : null

  const simLabel   = `${ratioPctChange.toFixed(0)}%`
  const firstLabel = chartData[0].xLabel
  const lastLabel  = chartData[chartData.length - 1].xLabel

  const formatPrice = (p: number) =>
    p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toPrecision(6).replace(/\.?0+$/, '')

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-400">Simulatore IL Personalizzato</h3>

      {/* ── Prezzi entry ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prezzi attuali (entry)</p>
        <div className="grid grid-cols-2 gap-4">
          <PriceInput
            label={`${token0} — prezzo entry`}
            value={token0EntryUSD}
            onChange={(v) => {
              setToken0EntryUSD(v)
              setToken0SimUSD(v)
            }}
            color="indigo"
          />
          <PriceInput
            label={`${token1} — prezzo entry`}
            value={token1EntryUSD}
            onChange={(v) => {
              setToken1EntryUSD(v)
              setToken1SimUSD(v)
            }}
            color="emerald"
          />
        </div>
        {entryRatio > 0 && (
          <p className="text-xs text-gray-600">
            Prezzo pool entry:{' '}
            <span className="text-gray-400 font-mono">{formatPrice(entryRatio)} {token0}/{token1}</span>
          </p>
        )}
      </div>

      {/* ── Controlli range ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Range posizione concentrata</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Range minimo */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Range minimo (ribasso)</span>
              <span className="text-white font-medium font-mono">{rangeMin}%</span>
            </div>
            <input
              type="range"
              min={-90} max={0} step={1}
              value={rangeMin}
              onChange={(e) => setRangeMin(parseInt(e.target.value, 10))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>−90%</span><span>0%</span>
            </div>
          </div>

          {/* Range massimo */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Range massimo (rialzo)</span>
              <span className="text-white font-medium font-mono">+{rangeMax}%</span>
            </div>
            <input
              type="range"
              min={0} max={500} step={5}
              value={rangeMax}
              onChange={(e) => setRangeMax(parseInt(e.target.value, 10))}
              className="w-full accent-green-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>0%</span><span>+500%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fee APR ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Fee APR (%)</p>
          <input
            type="number"
            value={feeAPR}
            onChange={(e) => setFeeAPR(Math.max(0, parseFloat(e.target.value) || 0))}
            step="0.1" min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Range impostato</p>
          <div className="bg-gray-800 rounded px-3 py-1.5 text-sm font-mono text-gray-300">
            {rangeMin}% / +{rangeMax}%
          </div>
        </div>
      </div>

      {/* ── Grafico ──────────────────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

          <XAxis
            dataKey="xLabel"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            interval={9}
          />
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

          {/* Zona fuori range a sinistra */}
          {leftCutPct && (
            <ReferenceArea
              yAxisId="left"
              x1={firstLabel} x2={leftCutPct}
              fill="#374151" fillOpacity={0.3}
              label={{ value: 'fuori range', fill: '#4b5563', fontSize: 9, position: 'insideTop' }}
            />
          )}
          {/* Zona fuori range a destra */}
          {rightCutPct && (
            <ReferenceArea
              yAxisId="left"
              x1={rightCutPct} x2={lastLabel}
              fill="#374151" fillOpacity={0.3}
              label={{ value: 'fuori range', fill: '#4b5563', fontSize: 9, position: 'insideTop' }}
            />
          )}

          {/* Linea verticale all'entry price (nessuna variazione) */}
          <ReferenceLine
            yAxisId="left" x="0%"
            stroke="#4b5563" strokeDasharray="4 4"
            label={{ value: 'entry', fill: '#4b5563', fontSize: 9, position: 'top' }}
          />

          {/* Linea verticale al prezzo simulato */}
          {Math.abs(ratioPctChange) > 0.5 && (
            <ReferenceLine
              yAxisId="left" x={simLabel}
              stroke="#a78bfa" strokeDasharray="3 3"
              label={{ value: 'sim', fill: '#a78bfa', fontSize: 9, position: 'top' }}
            />
          )}

          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(value: number, name: string) => {
              if (name === 'ilPercent')     return [`${value.toFixed(2)}%`, 'Impermanent Loss']
              if (name === 'feeOffsetDays') return [`${value?.toFixed(0) ?? '—'} giorni`, 'Fee per coprire IL']
              return [value, name]
            }}
          />

          <Line
            yAxisId="left"
            type="monotone" dataKey="ilPercent"
            stroke="#ef4444" strokeWidth={2.5}
            dot={false} activeDot={{ r: 4, fill: '#ef4444' }}
          />
          <Line
            yAxisId="right"
            type="monotone" dataKey="feeOffsetDays"
            stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5 3"
            dot={false} activeDot={{ r: 3, fill: '#60a5fa' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* ── Simula nuovi prezzi ──────────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-gray-800 pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Simula nuovi prezzi</p>
          <button
            onClick={() => { setToken0SimUSD(token0EntryUSD); setToken1SimUSD(token1EntryUSD) }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Token 0 simulato */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <p className="text-xs text-gray-400">{token0}</p>
              {token0PctChange !== 0 && (
                <span className={`text-xs font-mono ml-auto ${token0PctChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {token0PctChange > 0 ? '+' : ''}{token0PctChange.toFixed(1)}%
                </span>
              )}
            </div>
            <input
              type="number"
              value={token0SimUSD || ''}
              onChange={(e) => setToken0SimUSD(Math.max(0, parseFloat(e.target.value) || 0))}
              step="any" min="0"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="range"
              min={0.1} max={10} step={0.01}
              value={token0EntryUSD > 0 ? token0SimUSD / token0EntryUSD : 1}
              onChange={(e) => setToken0SimUSD(token0EntryUSD * parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>0.1x</span><span>1x</span><span>10x</span>
            </div>
          </div>

          {/* Token 1 simulato */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <p className="text-xs text-gray-400">{token1}</p>
              {token1PctChange !== 0 && (
                <span className={`text-xs font-mono ml-auto ${token1PctChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {token1PctChange > 0 ? '+' : ''}{token1PctChange.toFixed(1)}%
                </span>
              )}
            </div>
            <input
              type="number"
              value={token1SimUSD || ''}
              onChange={(e) => setToken1SimUSD(Math.max(0, parseFloat(e.target.value) || 0))}
              step="any" min="0"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="range"
              min={0.1} max={10} step={0.01}
              value={token1EntryUSD > 0 ? token1SimUSD / token1EntryUSD : 1}
              onChange={(e) => setToken1SimUSD(token1EntryUSD * parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>0.1x</span><span>1x</span><span>10x</span>
            </div>
          </div>
        </div>

        {/* Riepilogo ratio */}
        {entryRatio > 0 && simRatio > 0 && (
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="text-gray-500">
              Prezzo pool entry:{' '}
              <span className="text-gray-300 font-mono">{formatPrice(entryRatio)} {token0}/{token1}</span>
            </span>
            <span className="text-gray-500">
              Prezzo pool sim:{' '}
              <span className="text-gray-300 font-mono">{formatPrice(simRatio)} {token0}/{token1}</span>
            </span>
            <span className={`font-medium font-mono ${ratioPctChange > 0 ? 'text-green-400' : ratioPctChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              ratio {ratioPctChange >= 0 ? '+' : ''}{ratioPctChange.toFixed(2)}% ({r.toFixed(3)}x)
            </span>
          </div>
        )}
      </div>

      {/* ── Metriche al prezzo simulato ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Variazione ratio pool"
          value={`${r.toFixed(3)}x`}
          sub={`${ratioPctChange >= 0 ? '+' : ''}${ratioPctChange.toFixed(1)}%`}
          color="text-white"
        />
        <MetricCard
          label="Impermanent Loss"
          value={`${simIL.toFixed(2)}%`}
          sub={simResult.inRange ? 'in range' : 'fuori range'}
          color={simIL < -5 ? 'text-red-400' : simIL < -1 ? 'text-amber-400' : 'text-gray-300'}
        />
        <MetricCard
          label="Giorni per coprire IL"
          value={simFeeOffset != null ? `${simFeeOffset.toFixed(0)} gg` : feeAPR <= 0 ? 'N/D' : '0 gg'}
          sub={feeAPR > 0 ? `APR ${feeAPR.toFixed(1)}%` : 'imposta Fee APR'}
          color="text-blue-400"
        />
        <MetricCard
          label="Composizione posizione"
          value={simResult.inRange
            ? `${simResult.token0Pct}% / ${simResult.token1Pct}%`
            : simResult.token0Pct === 100 ? '100% token0' : '100% token1'
          }
          sub={`${token0} / ${token1}`}
          color="text-gray-300"
        />
      </div>

      {/* ── Barra composizione token ──────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{token0} ({simResult.token0Pct}%)</span>
          <span>{token1} ({simResult.token1Pct}%)</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-gray-700 flex">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${simResult.token0Pct}%` }}
          />
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${simResult.token1Pct}%` }}
          />
        </div>
      </div>

      {/* ── Punti chiave ─────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 mb-3">IL ai movimenti chiave del ratio pool</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: '−25%', r: 0.75 },
            { label: '−10%', r: 0.90 },
            { label:  '+10%', r: 1.10 },
            { label:  '+25%', r: 1.25 },
            { label:  '+50%', r: 1.50 },
            { label: '+100%', r: 2.00 },
          ].map(({ label, r: rp }) => {
            const { ilPercent, inRange } = calcV3IL(rp, rangeMin, rangeMax)
            return (
              <div key={label} className="bg-gray-800 rounded p-2 text-center">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${ilPercent < -5 ? 'text-red-400' : ilPercent < -1 ? 'text-amber-400' : 'text-gray-300'}`}>
                  {ilPercent.toFixed(1)}%
                </p>
                {!inRange && (
                  <p className="text-xs text-gray-600 mt-0.5">out</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
