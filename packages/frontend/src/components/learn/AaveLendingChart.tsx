import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ─── Aave V3-like interest rate model parameters ─────────────────────────────
const BASE_RATE       = 0.00  // 0%  — base borrow rate (Aave V3 WETH mainnet)
const SLOPE_1         = 0.038 // 3.8% — gentle slope below the kink
const SLOPE_2         = 0.80  // 80%  — steep slope above the kink (penalizes over-utilization)
const OPTIMAL_U       = 0.80  // 80%  — kink point (optimal utilization)
const RESERVE_FACTOR  = 0.15  // 15%  — protocol fee taken from borrower interest (Aave V3 WETH)

// ─── Collateral / liquidation parameters ─────────────────────────────────────
const ETH_PRICE       = 2000  // USD — fixed reference price for the simulator
const LTV             = 0.80  // 80% — maximum Loan-to-Value (how much you can borrow)
const LIQ_THRESHOLD   = 0.825 // 82.5% — liquidation threshold (slightly above LTV)

// ─── Pure interest-rate helpers ───────────────────────────────────────────────

/**
 * Aave piecewise interest rate model.
 * Below optimal: rate grows gently (slope1).
 * Above optimal: rate grows steeply (slope2) to incentivise repayment.
 * @param u utilization in [0, 1]
 */
function calcBorrowAPY(u: number): number {
  if (u <= OPTIMAL_U) {
    return BASE_RATE + (u / OPTIMAL_U) * SLOPE_1
  }
  const excessU = (u - OPTIMAL_U) / (1 - OPTIMAL_U)
  return BASE_RATE + SLOPE_1 + excessU * SLOPE_2
}

/**
 * Supply APY = what lenders earn.
 * It equals the utilization × borrow rate × (1 – reserveFactor).
 * The reserveFactor is the protocol cut.
 */
function calcSupplyAPY(u: number): number {
  return u * calcBorrowAPY(u) * (1 - RESERVE_FACTOR)
}

// ─── Collateral / Health Factor helpers ──────────────────────────────────────

/**
 * Health Factor: how far the position is from liquidation.
 * HF = (collateral_USD × liquidationThreshold) / debt_USD
 * HF < 1 → liquidation.
 */
function calcHealthFactor(collateralETH: number, debtUSDC: number, ethPrice: number): number {
  if (debtUSDC === 0) return Infinity
  return (collateralETH * ethPrice * LIQ_THRESHOLD) / debtUSDC
}

/** Max USDC borrowable given a collateral (LTV cap). */
function calcMaxBorrowable(collateralETH: number): number {
  return collateralETH * ETH_PRICE * LTV
}

/** ETH price at which the position would be liquidated (HF = 1.0). */
function calcLiquidationPrice(collateralETH: number, debtUSDC: number): number {
  if (collateralETH === 0) return 0
  return debtUSDC / (collateralETH * LIQ_THRESHOLD)
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt2 = (v: number) => v.toFixed(2)
const fmtUSD = (v: number) => `$${v.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
const fmtHF  = (v: number) => v === Infinity ? '∞' : v.toFixed(2)

// ─── Custom tooltip (shared) ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="text-slate-400 mb-1">Utilizzo: {label}%</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 1 — Curva di Utilizzo
// ─────────────────────────────────────────────────────────────────────────────
function UtilizationCurve() {
  const [utilization, setUtilization] = useState(70)

  // Build curve once — 101 points from 0% to 100%
  const curveData = useMemo(() => {
    return Array.from({ length: 101 }, (_, i) => {
      const u = i / 100
      return {
        u: i,
        'Borrow APY': parseFloat((calcBorrowAPY(u) * 100).toFixed(3)),
        'Supply APY': parseFloat((calcSupplyAPY(u) * 100).toFixed(3)),
      }
    })
  }, [])

  const currentBorrowAPY = calcBorrowAPY(utilization / 100) * 100
  const currentSupplyAPY = calcSupplyAPY(utilization / 100) * 100

  // Spread breakdown — dove va la differenza
  // Gli interessi totali prodotti = BorrowAPY × utilizzo (solo il capitale prestato genera interessi)
  // Quota protocollo = interessi totali × 15%
  // Quota idle = BorrowAPY × (1 - utilizzo)  ← interessi "persi" sul capitale non prestato
  const interestiTotali   = currentBorrowAPY * (utilization / 100)
  const quotaProtocollo   = interestiTotali * 0.15
  const quotaIdle         = currentBorrowAPY * (1 - utilization / 100)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="u"
              type="number"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              label={{ value: 'Tasso di Utilizzo (%)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              label={{ value: 'APY', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 11 }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Kink reference */}
            <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="3 2" strokeOpacity={0.8}
              label={{ value: 'Kink 80%', position: 'top', fill: '#d97706', fontSize: 10 }} />
            {/* Current utilization */}
            <ReferenceLine x={utilization} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.7} />
            {/* Borrow APY line */}
            <Line
              dataKey="Borrow APY"
              type="monotone"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {/* Supply APY line */}
            <Line
              dataKey="Supply APY"
              type="monotone"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1 pl-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Borrow APY</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Supply APY</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Kink (80%)</span>
        </div>
      </div>

      {/* Slider */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Tasso di Utilizzo corrente: <span className="text-slate-800 font-medium">{utilization}%</span>
        </label>
        <input
          type="range" min={0} max={100} step={1} value={utilization}
          onChange={(e) => setUtilization(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
          <span>0%</span><span>80% (kink)</span><span>100%</span>
        </div>
      </div>

      {/* Live stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Borrow APY attuale</div>
          <div className="text-red-600 font-semibold text-lg">{currentBorrowAPY.toFixed(2)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">pagato dai borrower</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Supply APY attuale</div>
          <div className="text-emerald-600 font-semibold text-lg">{currentSupplyAPY.toFixed(2)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">guadagnato dai lender</div>
        </div>
      </div>

      {/* Box: da dove viene il 2%? */}
      {(() => {
        const poolTotale     = 1_000_000                                        // USDC depositati nel pool (esempio fisso)
        const capitalePrestato = poolTotale * (utilization / 100)               // USDC effettivamente in prestito
        const interessiLordi = capitalePrestato * (currentBorrowAPY / 100)      // interessi generati dai borrower in 1 anno
        const quotaAave      = interessiLordi * 0.15                            // 15% va al protocollo
        const interessiNetti = interessiLordi - quotaAave                       // rimane ai lender
        const supplyAPYcheck = (interessiNetti / poolTotale) * 100              // diviso su tutto il capitale depositato
        const fmt = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 0 })
        return (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3 text-sm">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              Come nasce il rendimento del {currentSupplyAPY.toFixed(2)}% — esempio con pool da $1.000.000
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">0</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Il tasso dei borrower non è fisso: lo calcola il protocollo in base a quanta parte del pool è utilizzata.
                  Con utilizzo al <span className="font-semibold text-indigo-700">{utilization}%</span> — sotto la soglia dell'80% —
                  il tasso è proporzionale: <span className="font-semibold">({utilization}% ÷ 80%) × 3.8% = <span className="text-red-600">{currentBorrowAPY.toFixed(2)}%</span></span>.
                  Il <span className="font-semibold">3.8%</span> è il tasso massimo del ramo lento (<em>slope1</em>), un parametro fisso
                  deciso dalla governance Aave tramite voto on-chain — non cambia finché non viene approvata una nuova proposta.
                  Più il pool è usato, più il tasso sale per attirare nuovi depositi e frenare i prestiti.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Il pool ha <span className="font-semibold text-slate-800">${fmt(poolTotale)}</span> USDC depositati in totale dai lender.
                  Al {utilization}% di utilizzo, <span className="font-semibold text-indigo-700">${fmt(capitalePrestato)}</span> sono in prestito
                  e <span className="font-semibold text-slate-500">${fmt(poolTotale - capitalePrestato)}</span> sono fermi nel pool.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  I borrower pagano il <span className="font-semibold text-red-600">{currentBorrowAPY.toFixed(2)}%</span> annuo
                  su <span className="font-semibold">${fmt(capitalePrestato)}</span> →
                  generano <span className="font-semibold text-slate-800">${fmt(interessiLordi)}</span> di interessi in un anno.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Aave trattiene il 15%: <span className="font-semibold text-slate-800">${fmt(quotaAave)}</span>.
                  Ai lender restano <span className="font-semibold text-emerald-700">${fmt(interessiNetti)}</span>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Questi <span className="font-semibold text-emerald-700">${fmt(interessiNetti)}</span> si distribuiscono
                  su <em>tutti</em> i <span className="font-semibold">${fmt(poolTotale)}</span> depositati — anche quelli fermi.
                  Quindi: <span className="font-semibold">${fmt(interessiNetti)}</span> ÷ <span className="font-semibold">${fmt(poolTotale)}</span> = <span className="font-semibold text-emerald-600">{supplyAPYcheck.toFixed(2)}%</span> annuo per ogni lender.
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Spiegazione — reattiva allo slider */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-200 text-sm">

        {/* Borrow APY */}
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-slate-700">Tasso pagato dai borrower</p>
            {utilization <= 80 ? (
              <p className="text-slate-500 text-xs leading-relaxed">
                Utilizzo al <span className="font-semibold text-indigo-600">{utilization}%</span>, sotto la soglia dell'80%.
                Il tasso è proporzionale: a utilizzo pieno (80%) arriverebbe al massimo di <span className="font-semibold">3.8%</span>.
                Ora è al <span className="font-semibold text-red-600">{(utilization / 80 * 100).toFixed(0)}%</span> di quel massimo.
              </p>
            ) : (
              <p className="text-slate-500 text-xs leading-relaxed">
                Utilizzo al <span className="font-semibold text-indigo-600">{utilization}%</span>, <span className="text-red-600 font-semibold">oltre la soglia dell'80%</span>.
                I {utilization - 80} punti extra oltre il kink fanno scattare il ramo ripido:
                il tasso sale molto più velocemente per forzare i rimborsi.
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-red-600">{currentBorrowAPY.toFixed(2)}%</div>
            <div className="text-xs text-slate-400">annuo</div>
          </div>
        </div>

        {/* Supply APY */}
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-slate-700">Tasso guadagnato dai lender</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Solo il <span className="font-semibold text-indigo-600">{utilization}%</span> del capitale depositato è prestato e genera interessi.
              Il restante <span className="font-semibold">{100 - utilization}%</span> è fermo ma dilui­sce il rendimento.
              In più, il <span className="font-semibold">15%</span> degli interessi va al protocollo Aave.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-emerald-600">{currentSupplyAPY.toFixed(2)}%</div>
            <div className="text-xs text-slate-400">annuo</div>
          </div>
        </div>

        {/* Spread */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-slate-700">Differenza (spread)</p>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-slate-700">{(currentBorrowAPY - currentSupplyAPY).toFixed(2)}%</div>
            </div>
          </div>
          <p className="text-slate-500 text-xs">Gli interessi pagati dai borrower si dividono in tre parti:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
                <span className="text-slate-600">Ai lender</span>
              </span>
              <span className="font-mono font-semibold text-emerald-600">{currentSupplyAPY.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 shrink-0" />
                <span className="text-slate-600">Al protocollo Aave (15% degli interessi sul capitale prestato)</span>
              </span>
              <span className="font-mono font-semibold text-indigo-500">{quotaProtocollo.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
                <span className="text-slate-600">Non generati — il {100 - utilization}% del pool è fermo, nessun borrower lo usa, quindi nessun interesse viene prodotto su quella parte</span>
              </span>
              <span className="font-mono font-semibold text-slate-500">{quotaIdle.toFixed(2)}%</span>
            </div>
          </div>
          {/* Stacked bar */}
          <div className="flex rounded overflow-hidden h-3 mt-1">
            <div className="bg-emerald-400 transition-all" style={{ width: `${(currentSupplyAPY / currentBorrowAPY) * 100}%` }} />
            <div className="bg-indigo-300 transition-all" style={{ width: `${(quotaProtocollo / currentBorrowAPY) * 100}%` }} />
            <div className="bg-slate-200 transition-all flex-1" />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 2 — Health Factor Gauge + Simulatore
// ─────────────────────────────────────────────────────────────────────────────

/** Convert HF value to needle angle (degrees).
 *  HF=0 → 180° (pointing left), HF=3+ → 0° (pointing right).
 */
function hfToAngle(hf: number): number {
  return 180 - (Math.min(hf, 3) / 3) * 180
}

function HealthFactorGauge() {
  const [collateralETH, setCollateralETH] = useState(4)
  const [borrowedUSDC, setBorrowedUSDC] = useState(5000)

  const maxBorrow = calcMaxBorrowable(collateralETH)
  const hf = calcHealthFactor(collateralETH, borrowedUSDC, ETH_PRICE)
  const liqPrice = calcLiquidationPrice(collateralETH, borrowedUSDC)
  const angle = hfToAngle(hf)

  // Color coding for HF
  const hfColor = hf < 1 ? '#ef4444' : hf < 1.5 ? '#f59e0b' : '#10b981'
  const hfLabel = hf < 1 ? 'LIQUIDAZIONE' : hf < 1.5 ? 'Rischio' : 'Sicuro'

  // Clamp borrow when collateral decreases
  function handleCollateralChange(val: number) {
    setCollateralETH(val)
    setBorrowedUSDC((prev) => Math.min(prev, calcMaxBorrowable(val)))
  }

  // SVG arc helpers
  const R = 75      // arc radius
  const CX = 100    // center X
  const CY = 100    // center Y (bottom of viewBox)

  /** Polar to cartesian on the semicircle (180° = left, 0° = right) */
  function polar(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: CX - R * Math.cos(rad),
      y: CY - R * Math.sin(rad),
    }
  }

  /** SVG arc path from startDeg to endDeg (degrees, both on 0–180 scale) */
  function arcPath(startDeg: number, endDeg: number) {
    const s = polar(startDeg)
    const e = polar(endDeg)
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 0 ${e.x} ${e.y}`
  }

  // Arc segments: red 180→120, orange 120→84, green 84→0
  // (mapped: HF 0→1 = 180→120, HF 1→1.5 = 120→90, HF 1.5→3 = 90→0)
  // More precise: each 1 unit HF = 60° (since 180° total for HF 0→3)
  // HF=1 → angle=120°; HF=1.5 → angle=90°
  const needleEnd = polar(angle)

  return (
    <div className="space-y-4">
      {/* SVG Gauge */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-xs" aria-label="Health Factor gauge">
          {/* Background track */}
          <path d={arcPath(180, 0)} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="round" />
          {/* Red zone: HF 0 → 1 (180° → 120°) */}
          <path d={arcPath(180, 120)} fill="none" stroke="#fca5a5" strokeWidth={14} />
          {/* Orange zone: HF 1 → 1.5 (120° → 90°) */}
          <path d={arcPath(120, 90)} fill="none" stroke="#fcd34d" strokeWidth={14} />
          {/* Green zone: HF 1.5 → 3 (90° → 0°) */}
          <path d={arcPath(90, 0)} fill="none" stroke="#6ee7b7" strokeWidth={14} />
          {/* Needle */}
          <line
            x1={CX} y1={CY}
            x2={needleEnd.x} y2={needleEnd.y}
            stroke="#1e293b"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Center hub */}
          <circle cx={CX} cy={CY} r={5} fill="#1e293b" />
          {/* HF value text */}
          <text
            x={CX} y={CY - 18}
            textAnchor="middle"
            fontSize={20}
            fontWeight="bold"
            fill={hfColor}
          >
            {fmtHF(hf)}
          </text>
          {/* HF label */}
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize={8} fill={hfColor}>
            {hfLabel}
          </text>
          {/* Axis labels */}
          <text x={18} y={105} textAnchor="middle" fontSize={8} fill="#94a3b8">0</text>
          <text x={100} y={20}  textAnchor="middle" fontSize={8} fill="#94a3b8">1.5</text>
          <text x={182} y={105} textAnchor="middle" fontSize={8} fill="#94a3b8">3+</text>
        </svg>

        {/* Zone legend */}
        <div className="flex gap-3 text-xs mt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 inline-block" />{'< 1 Liquidazione'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" />{'1–1.5 Rischio'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />{'>1.5 Sicuro'}</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Collaterale: <span className="text-slate-800 font-medium">{collateralETH.toFixed(1)} ETH</span>
            <span className="text-slate-400 ml-2">= {fmtUSD(collateralETH * ETH_PRICE)}</span>
          </label>
          <input
            type="range" min={0} max={10} step={0.1} value={collateralETH}
            onChange={(e) => handleCollateralChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>0 ETH</span><span>10 ETH</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            USDC in prestito: <span className="text-slate-800 font-medium">{fmtUSD(borrowedUSDC)}</span>
            <span className="text-slate-400 ml-2">(max: {fmtUSD(maxBorrow)})</span>
          </label>
          <input
            type="range" min={0} max={Math.max(maxBorrow, 1)} step={100} value={borrowedUSDC}
            onChange={(e) => setBorrowedUSDC(Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>$0</span><span>{fmtUSD(maxBorrow)} (LTV 80%)</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Max prestabile</div>
          <div className="text-emerald-700 font-semibold">{fmtUSD(maxBorrow)}</div>
          <div className="text-xs text-slate-400">LTV 80%</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">Prezzo liquidazione</div>
          <div className="text-amber-700 font-semibold">
            {borrowedUSDC === 0 ? '—' : fmtUSD(liqPrice)}
          </div>
          <div className="text-xs text-slate-400">ETH/USDC</div>
        </div>
        <div
          className={`rounded-lg p-3 text-center border ${
            hf < 1 ? 'bg-red-50 border-red-200' : hf < 1.5 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="text-xs text-slate-400 mb-1">Health Factor</div>
          <div className="font-semibold text-lg" style={{ color: hfColor }}>{fmtHF(hf)}</div>
          <div className="text-xs text-slate-400">{hfLabel}</div>
        </div>
      </div>

      {/* Reactive step-by-step calculation */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
          Calcolo step-by-step — Health Factor
        </p>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th className="text-left pb-2 pr-4 font-medium">Step</th>
              <th className="text-left pb-2 pr-4 font-medium">Cosa calcoli</th>
              <th className="text-left pb-2 font-medium">Risultato</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold">1</td>
              <td className="py-2 pr-4 text-slate-600">Valore collaterale in USD</td>
              <td className="py-2 text-slate-700">{fmt2(collateralETH)} ETH × {fmtUSD(ETH_PRICE)} = <span className="text-indigo-600 font-semibold">{fmtUSD(collateralETH * ETH_PRICE)}</span></td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold">2</td>
              <td className="py-2 pr-4 text-slate-600">Soglia di liquidazione (LT 82.5%)</td>
              <td className="py-2 text-slate-700">{fmtUSD(collateralETH * ETH_PRICE)} × 0.825 = <span className="text-indigo-600 font-semibold">{fmtUSD(collateralETH * ETH_PRICE * LIQ_THRESHOLD)}</span></td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-400 font-semibold">3</td>
              <td className="py-2 pr-4 text-slate-600">Debito totale (USDC)</td>
              <td className="py-2 text-slate-700"><span className="text-red-600 font-semibold">{fmtUSD(borrowedUSDC)}</span></td>
            </tr>
            <tr className="border-t border-slate-200 bg-slate-100/50">
              <td className="py-2 pr-4 text-slate-400 font-semibold">HF</td>
              <td className="py-2 pr-4 text-slate-600">HF = soglia / debito</td>
              <td className="py-2" style={{ color: hfColor }}>
                {borrowedUSDC === 0
                  ? <span className="font-semibold">∞ (nessun debito)</span>
                  : <span className="font-semibold">{fmtUSD(collateralETH * ETH_PRICE * LIQ_THRESHOLD)} ÷ {fmtUSD(borrowedUSDC)} = {fmt2(hf)}</span>
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 3 — Scenari di Liquidazione
// ─────────────────────────────────────────────────────────────────────────────

// Fixed position for the liquidation demo
const DEMO_COLLATERAL_ETH = 5
const DEMO_DEBT_USDC = 4500   // chosen so HF ≈ 1.82 at ETH=$2000

const LIQTIMELINE_SCENARIOS = [
  { ethPrice: 2000, label: 'ETH = $2,000', note: 'Posizione aperta, mercato stabile' },
  { ethPrice: 1600, label: 'ETH = $1,600', note: 'Correzione −20%, posizione a rischio' },
  { ethPrice: 1300, label: 'ETH = $1,300', note: 'Crollo −35%, liquidazione!' },
]

function LiquidationTimeline() {
  const [scenarioIdx, setScenarioIdx] = useState(0)

  const scenarios = LIQTIMELINE_SCENARIOS.map((s) => ({
    ...s,
    hf: calcHealthFactor(DEMO_COLLATERAL_ETH, DEMO_DEBT_USDC, s.ethPrice),
  }))

  const active = scenarios[scenarioIdx]
  const nextIdx = (scenarioIdx + 1) % scenarios.length
  const nextPrice = scenarios[nextIdx].ethPrice

  function hfBadgeClass(hf: number) {
    if (hf < 1)   return 'bg-red-100 text-red-700 border-red-200'
    if (hf < 1.5) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }

  // Liquidation breakdown (only relevant when HF < 1)
  const debtRepaid        = DEMO_DEBT_USDC * 0.5                        // liquidator repays 50%
  const collateralSeized  = debtRepaid * 1.05                           // collateral received incl. 5% bonus
  const collateralTotal   = DEMO_COLLATERAL_ETH * active.ethPrice       // total collateral value at current price
  const collateralLeft    = Math.max(0, collateralTotal - collateralSeized) // what remains for borrower
  const bonusUSD          = debtRepaid * 0.05                           // the extra 5% cost to borrower
  // Bar widths as percentages of total collateral
  const pctSeized = Math.min(100, (collateralSeized / collateralTotal) * 100)
  const pctLeft   = Math.max(0, 100 - pctSeized)

  return (
    <div className="space-y-4">
      {/* Position summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-slate-600">
        <strong className="text-indigo-700">Posizione di esempio:</strong>{' '}
        {DEMO_COLLATERAL_ETH} ETH come collaterale · {fmtUSD(DEMO_DEBT_USDC)} USDC in prestito ·
        Prezzo di liquidazione: <strong className="text-slate-800">{fmtUSD(calcLiquidationPrice(DEMO_COLLATERAL_ETH, DEMO_DEBT_USDC))}</strong>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        {scenarios.map((s, i) => {
          const isActive = i === scenarioIdx
          const hfClass = hfBadgeClass(s.hf)
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-3 border-2 ${isActive ? 'bg-indigo-500 border-indigo-600' : 'bg-slate-200 border-slate-300'}`} />
                {i < scenarios.length - 1 && <div className="w-0.5 h-8 bg-slate-200 mt-0.5" />}
              </div>
              <div className={`flex-1 rounded-lg border p-3 mb-2 transition-all ${
                isActive ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{s.note}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded border ${hfClass}`}>
                    HF = {fmt2(s.hf)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Button — mostra il prezzo corrente e dove porta il click */}
      <button
        onClick={() => setScenarioIdx(nextIdx)}
        className="w-full py-2.5 rounded-lg border border-indigo-200 bg-white text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-slate-400">Prezzo ETH corrente:</span>
        <span className="text-indigo-700 font-semibold">{fmtUSD(active.ethPrice)}</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-500">simula {fmtUSD(nextPrice)}</span>
      </button>

      {/* Liquidation breakdown — visibile solo nello scenario di liquidazione */}
      {active.hf < 1 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold text-red-700">
            ⚠ Health Factor &lt; 1 — liquidazione in corso
          </p>

          {/* Collateral breakdown bar */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Dove va il collaterale ({fmtUSD(collateralTotal)} in ETH)
            </p>
            <div className="flex rounded-lg overflow-hidden h-8 text-xs font-semibold">
              <div
                className="bg-red-400 flex items-center justify-center text-white whitespace-nowrap px-2 transition-all"
                style={{ width: `${pctSeized}%` }}
              >
                {pctSeized > 25 ? `Liquidatore ${pctSeized.toFixed(0)}%` : ''}
              </div>
              <div
                className="bg-slate-200 flex items-center justify-center text-slate-600 whitespace-nowrap px-2 transition-all"
                style={{ width: `${pctLeft}%` }}
              >
                {pctLeft > 15 ? `Borrower ${pctLeft.toFixed(0)}%` : ''}
              </div>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Sequestrato dal liquidatore</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" />Rimane al borrower</span>
            </div>
          </div>

          {/* Breakdown numbers */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg border border-red-200 p-3">
              <div className="text-xs text-slate-400 mb-1">Debito ripagato dal liquidatore</div>
              <div className="font-semibold text-slate-800">{fmtUSD(debtRepaid)}</div>
              <div className="text-xs text-slate-400 mt-0.5">50% del debito totale</div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-3">
              <div className="text-xs text-slate-400 mb-1">Collaterale sequestrato</div>
              <div className="font-semibold text-slate-800">{fmtUSD(collateralSeized)}</div>
              <div className="text-xs text-red-500 mt-0.5">di cui {fmtUSD(bonusUSD)} è il bonus (5%)</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Il borrower perde <strong className="text-red-600">{fmtUSD(bonusUSD)} in più</strong> rispetto al debito ripagato —
            è la penalità per aver lasciato scendere l'HF sotto 1. Il restante collaterale ({fmtUSD(collateralLeft)}) rimane al borrower.
          </p>
        </div>
      )}

      {/* Lender note — sempre visibile */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-slate-600">
        <strong className="text-emerald-700">E chi ha fornito la liquidità (lender)?</strong>
        <p className="mt-1 leading-relaxed">
          Il lender <strong className="text-slate-800">non viene toccato</strong> dalla liquidazione del borrower.
          I suoi USDC depositati continuano a generare interesse normalmente — la liquidazione riguarda solo
          il rapporto tra borrower e protocollo. Il rischio del lender è diverso:{' '}
          <span className="text-amber-700 font-medium">liquidity risk</span> (non riesce a ritirare se l'utilizzo
          è al 100%) e, in casi estremi,{' '}
          <span className="text-red-600 font-medium">insolvency risk</span> (se le liquidazioni non coprono il
          debito e il protocollo accumula bad debt).
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 4 — APY live (con fallback a dati mock)
// ─────────────────────────────────────────────────────────────────────────────

interface ApyRow {
  symbol: string
  supplyApy: number
  borrowApy: number
}

const MOCK_APY: ApyRow[] = [
  { symbol: 'ETH',  supplyApy: 1.8, borrowApy: 3.2 },
  { symbol: 'USDC', supplyApy: 4.5, borrowApy: 5.8 },
  { symbol: 'USDT', supplyApy: 4.3, borrowApy: 5.5 },
  { symbol: 'WBTC', supplyApy: 0.5, borrowApy: 2.1 },
]

function LiveApyData() {
  const [apyData, setApyData] = useState<ApyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchApyData() {
      try {
        // Attempt to fetch real Aave V3 data from a public source.
        // This will likely fail due to CORS in a browser context — the catch
        // block handles that gracefully by falling back to mock data.
        const res = await fetch(
          'https://aave-api-v2.aave.com/data/liquidity/v2?poolId=0xb53c1a33016b2dc2ff3653530bff1848a515c8c5',
          { signal: controller.signal },
        )
        if (!res.ok) throw new Error('non-200')
        const json = await res.json()
        // Parse Aave API response format (array of reserve objects)
        const parsed: ApyRow[] = (json as { symbol: string; liquidityRate: string; variableBorrowRate: string }[])
          .filter((r) => ['ETH', 'USDC', 'USDT', 'WBTC', 'WETH'].includes(r.symbol))
          .slice(0, 4)
          .map((r) => ({
            symbol: r.symbol === 'WETH' ? 'ETH' : r.symbol,
            // Aave rates are in ray (1e27) — convert to percentage
            supplyApy: parseFloat(r.liquidityRate) / 1e25,
            borrowApy: parseFloat(r.variableBorrowRate) / 1e25,
          }))
        if (parsed.length === 0) throw new Error('empty')
        setApyData(parsed)
      } catch {
        // Network error, CORS, or parse failure — show mock data
        setApyData(MOCK_APY)
        setIsMock(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchApyData()
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded mb-3 w-12" />
            <div className="h-3 bg-slate-100 rounded mb-1.5" />
            <div className="h-3 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {apyData.map((row) => (
          <div key={row.symbol} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-slate-800 mb-3">{row.symbol}</div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Supply APY</span>
              <span className="text-emerald-600 font-medium">{row.supplyApy.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Borrow APY</span>
              <span className="text-red-500 font-medium">{row.borrowApy.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
      {isMock && (
        <p className="text-xs text-slate-400 italic">
          * Dati di esempio — il feed live non è disponibile in questo ambiente.
          I tassi reali variano continuamente su{' '}
          <span className="text-slate-500">app.aave.com</span>.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — Composition
// ─────────────────────────────────────────────────────────────────────────────
export default function AaveLendingChart() {
  return (
    <div className="space-y-10">

      {/* Parte 1 */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Parte 1 — Curva di Utilizzo e Tassi di Interesse
        </p>
        <UtilizationCurve />
      </div>

      <div className="border-t border-slate-100" />

      {/* Parte 2 */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Parte 2 — Simulatore Health Factor
        </p>
        <HealthFactorGauge />
      </div>

      <div className="border-t border-slate-100" />

      {/* Parte 3 */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Parte 3 — Scenari di Liquidazione
        </p>
        <LiquidationTimeline />
      </div>

      <div className="border-t border-slate-100" />

      {/* Parte 4 */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Parte 4 — APY in tempo reale (Aave V3)
        </p>
        <LiveApyData />
      </div>

    </div>
  )
}
