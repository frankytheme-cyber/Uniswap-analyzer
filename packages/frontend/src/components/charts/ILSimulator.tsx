import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import type { ILPoint } from '../../types.ts'

interface Props {
  points: ILPoint[]
  currentFeeAPR: number
  currentPrice?: number   // prezzo token0/token1 dal giorno più recente
  token0?: string
  token1?: string
}

function formatMultiplier(value: number): string {
  if (value === 1) return '0%'
  const pct = (value - 1) * 100
  return pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`
}

function calcILPercent(r: number): number {
  return (2 * Math.sqrt(r) / (1 + r) - 1) * 100
}

export default function ILSimulator({
  points,
  currentFeeAPR,
  currentPrice,
  token0 = 'token0',
  token1 = 'token1',
}: Props) {
  const [simulatedMultiplier, setSimulatedMultiplier] = useState(2)
  const [priceInput, setPriceInput] = useState('')
  const initializedRef = useRef(false)

  // Inizializza priceInput quando currentPrice diventa disponibile
  useEffect(() => {
    if (currentPrice && currentPrice > 0 && !initializedRef.current) {
      initializedRef.current = true
      setPriceInput((currentPrice * simulatedMultiplier).toFixed(6))
    }
  }, [currentPrice])

  const hasPriceData = !!currentPrice && currentPrice > 0

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mult = parseFloat(e.target.value)
    setSimulatedMultiplier(mult)
    if (hasPriceData) {
      setPriceInput((currentPrice * mult).toFixed(6))
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPriceInput(val)
    const parsed = parseFloat(val)
    if (!isNaN(parsed) && parsed > 0 && hasPriceData) {
      // Clamp to slider range [0.1, 10]
      setSimulatedMultiplier(Math.min(Math.max(parsed / currentPrice, 0.1), 10))
    }
  }

  const ilAtSimulated   = calcILPercent(simulatedMultiplier)
  const dailyFeeRate    = currentFeeAPR / 365
  const daysAtSimulated = dailyFeeRate > 0 ? Math.abs(ilAtSimulated) / dailyFeeRate : null

  // Prepara dati grafico
  const data = points.map((p) => ({
    xLabel:        formatMultiplier(p.priceMultiplier),
    ilPercent:     parseFloat(p.ilPercent.toFixed(2)),
    feeOffsetDays: p.feeOffsetDays === -1 ? null : parseFloat(p.feeOffsetDays.toFixed(1)),
  }))

  return (
    <div className="space-y-6">

      {/* Curva IL */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Curva Impermanent Loss</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

            <XAxis
              dataKey="xLabel"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
            />

            <YAxis
              yAxisId="left"
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fill: '#ef4444', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => `${v.toFixed(0)}gg`}
              tick={{ fill: '#60a5fa', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />

            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af', fontSize: 11 }}
              formatter={(value: number, name: string) => {
                if (name === 'ilPercent') return [`${value.toFixed(2)}%`, 'Impermanent Loss']
                return [`${value.toFixed(0)} giorni`, 'Fee per coprire IL']
              }}
            />

            <Legend
              formatter={(value) => (
                <span style={{ color: '#9ca3af', fontSize: 11 }}>
                  {value === 'ilPercent' ? 'Impermanent Loss (%)' : 'Giorni fee per coprire IL'}
                </span>
              )}
            />

            {/* Linea verticale al prezzo corrente (nessuna variazione) */}
            <ReferenceLine
              yAxisId="left"
              x="0%"
              stroke="#6b7280"
              strokeDasharray="4 4"
              label={{ value: 'attuale', fill: '#4b5563', fontSize: 9, position: 'top' }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ilPercent"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="feeOffsetDays"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#60a5fa' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Simulatore */}
      <div className="border-t border-gray-800 pt-6 space-y-5">
        <h3 className="text-sm font-medium text-gray-400">Simula Variazione Prezzo</h3>

        {/* Input prezzo (solo se currentPrice disponibile) */}
        {hasPriceData && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Prezzo corrente ({token0}/{token1})</p>
              <div className="bg-gray-800 rounded px-3 py-1.5 text-sm text-gray-300 font-mono">
                {currentPrice.toFixed(6)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Prezzo ipotetico ({token0}/{token1})</p>
              <input
                type="number"
                value={priceInput}
                onChange={handlePriceChange}
                step="any"
                min="0"
                placeholder={`es. ${(currentPrice * 2).toFixed(6)}`}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Moltiplicatore di prezzo</span>
            <span className="text-gray-300 font-medium">
              {simulatedMultiplier.toFixed(2)}x ({formatMultiplier(simulatedMultiplier)})
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.01"
            value={simulatedMultiplier}
            onChange={handleSliderChange}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>0.1x (−90%)</span>
            <span>1x (0%)</span>
            <span>10x (+900%)</span>
          </div>
        </div>

        {/* Risultati */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Variazione prezzo</p>
            <p className="text-lg font-bold text-white">{formatMultiplier(simulatedMultiplier)}</p>
            <p className="text-xs text-gray-600 mt-0.5">{simulatedMultiplier.toFixed(2)}x</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Impermanent Loss</p>
            <p className="text-lg font-bold text-red-400">{ilAtSimulated.toFixed(2)}%</p>
            <p className="text-xs text-gray-600 mt-0.5">vs hold puro</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Giorni per coprire IL</p>
            {daysAtSimulated !== null ? (
              <>
                <p className="text-lg font-bold text-blue-400">{daysAtSimulated.toFixed(0)} gg</p>
                <p className="text-xs text-gray-600 mt-0.5">fee APR {currentFeeAPR.toFixed(1)}%</p>
              </>
            ) : (
              <p className="text-lg font-bold text-gray-600">N/D</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
