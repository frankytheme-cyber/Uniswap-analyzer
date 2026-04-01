import { useState, useMemo } from 'react'
import { calculateCompoundedRate } from '@aave/math-utils'
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

function calcBorrowAPY(u: number): number {
  if (u <= OPTIMAL_U) {
    return BASE_RATE + (u / OPTIMAL_U) * SLOPE_1
  }
  const excessU = (u - OPTIMAL_U) / (1 - OPTIMAL_U)
  return BASE_RATE + SLOPE_1 + excessU * SLOPE_2
}

function calcSupplyAPY(u: number): number {
  return u * calcBorrowAPY(u) * (1 - RESERVE_FACTOR)
}

// ─── Collateral / Health Factor helpers ──────────────────────────────────────

function calcHealthFactor(collateralETH: number, debtUSDC: number, ethPrice: number): number {
  if (debtUSDC === 0) return Infinity
  return (collateralETH * ethPrice * LIQ_THRESHOLD) / debtUSDC
}

function calcMaxBorrowable(collateralETH: number): number {
  return collateralETH * ETH_PRICE * LTV
}

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
    <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
         className="border rounded-lg px-3 py-2 text-xs shadow-sm">
      <p style={{ color: 'var(--text-muted)' }} className="mb-1">Utilizzo: {label}%</p>
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

  const sdkVerification = useMemo(() => {
    try {
      const SECONDS_PER_YEAR = 31536000
      const RAY_STR = '1' + '0'.repeat(27)

      function aprToRay(apr: number): string {
        const scaled = Math.round(apr * 1e9)
        return scaled.toString() + '0'.repeat(18)
      }

      const borrowAPR = calcBorrowAPY(utilization / 100)
      const supplyAPR = calcSupplyAPY(utilization / 100)

      const sdkBorrowRaw = calculateCompoundedRate({
        rate: aprToRay(borrowAPR),
        duration: SECONDS_PER_YEAR,
      })
      const sdkSupplyRaw = calculateCompoundedRate({
        rate: aprToRay(supplyAPR),
        duration: SECONDS_PER_YEAR,
      })

      const sdkBorrowAPY = (Number(sdkBorrowRaw.toString()) / Number(RAY_STR)) * 100
      const sdkSupplyAPY = (Number(sdkSupplyRaw.toString()) / Number(RAY_STR)) * 100

      return {
        sdkBorrowAPY,
        sdkSupplyAPY,
        deltaBorrow: Math.abs(sdkBorrowAPY - currentBorrowAPY),
        deltaSupply: Math.abs(sdkSupplyAPY - currentSupplyAPY),
        error: false,
      }
    } catch {
      return { sdkBorrowAPY: 0, sdkSupplyAPY: 0, deltaBorrow: 0, deltaSupply: 0, error: true }
    }
  }, [utilization, currentBorrowAPY, currentSupplyAPY])

  const interestiTotali   = currentBorrowAPY * (utilization / 100)
  const quotaProtocollo   = interestiTotali * 0.15
  const quotaIdle         = currentBorrowAPY * (1 - utilization / 100)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }} className="border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="u"
              type="number"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              label={{ value: 'Tasso di Utilizzo (%)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              label={{ value: 'APY', angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--text-muted)', fontSize: 11 }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="3 2" strokeOpacity={0.8}
              label={{ value: 'Kink 80%', position: 'top', fill: '#d97706', fontSize: 10 }} />
            <ReferenceLine x={utilization} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.7} />
            <Line dataKey="Borrow APY" type="monotone" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="Supply APY" type="monotone" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1 pl-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Borrow APY</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Supply APY</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Kink (80%)</span>
        </div>
      </div>

      {/* Slider */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          Tasso di Utilizzo corrente: <span style={{ color: 'var(--text-primary)' }} className="font-medium">{utilization}%</span>
        </label>
        <input
          type="range" min={0} max={100} step={1} value={utilization}
          onChange={(e) => setUtilization(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          <span>0%</span><span>80% (kink)</span><span>100%</span>
        </div>
      </div>

      {/* Live stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div style={{ backgroundColor: 'var(--bad-bg)', borderColor: 'var(--bad-border)' }} className="border rounded-lg p-3 text-center">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Borrow APY attuale</div>
          <div className="font-semibold text-lg" style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>pagato dai borrower</div>
        </div>
        <div style={{ backgroundColor: 'var(--good-bg)', borderColor: 'var(--good-border)' }} className="border rounded-lg p-3 text-center">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Supply APY attuale</div>
          <div className="font-semibold text-lg" style={{ color: 'var(--good-text)' }}>{currentSupplyAPY.toFixed(2)}%</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>guadagnato dai lender</div>
        </div>
      </div>

      {/* Badge verifica SDK @aave/math-utils */}
      {!sdkVerification.error && (
        <div style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)' }} className="border rounded-lg px-4 py-3 space-y-3 text-xs">
          <span style={{ color: 'var(--text-muted)' }} className="font-medium uppercase tracking-wide">Verifica @aave/math-utils</span>
          <div className="grid grid-cols-2 gap-3">
            <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }} className="border rounded-lg p-3">
              <div style={{ color: 'var(--text-muted)' }} className="mb-1">Borrow APY (composto SDK)</div>
              <div className="font-mono font-bold text-base" style={{ color: 'var(--bad-text)' }}>{sdkVerification.sdkBorrowAPY.toFixed(3)}%</div>
              <div className="mt-1 font-semibold" style={{ color: sdkVerification.deltaBorrow < 0.01 ? 'var(--good-text)' : 'var(--warn-text)' }}>
                {sdkVerification.deltaBorrow < 0.01 ? '✓' : 'Δ'} delta {sdkVerification.deltaBorrow.toFixed(4)}% vs nostro {currentBorrowAPY.toFixed(3)}%
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }} className="border rounded-lg p-3">
              <div style={{ color: 'var(--text-muted)' }} className="mb-1">Supply APY (composto SDK)</div>
              <div className="font-mono font-bold text-base" style={{ color: 'var(--good-text)' }}>{sdkVerification.sdkSupplyAPY.toFixed(3)}%</div>
              <div className="mt-1 font-semibold" style={{ color: sdkVerification.deltaSupply < 0.01 ? 'var(--good-text)' : 'var(--warn-text)' }}>
                {sdkVerification.deltaSupply < 0.01 ? '✓' : 'Δ'} delta {sdkVerification.deltaSupply.toFixed(4)}% vs nostro {currentSupplyAPY.toFixed(3)}%
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)' }} className="leading-relaxed">
            Il nostro modello usa <strong style={{ color: 'var(--text-secondary)' }}>APR semplice</strong>. L'SDK Aave usa <strong style={{ color: 'var(--text-secondary)' }}>APY composto</strong> — gli interessi maturano secondo per secondo e si capitalizzano. La differenza è fisiologica e cresce all'aumentare del tasso.
          </p>
        </div>
      )}

      {/* Box: da dove viene il 2%? */}
      {(() => {
        const poolTotale     = 1_000_000
        const capitalePrestato = poolTotale * (utilization / 100)
        const interessiLordi = capitalePrestato * (currentBorrowAPY / 100)
        const quotaAave      = interessiLordi * 0.15
        const interessiNetti = interessiLordi - quotaAave
        const supplyAPYcheck = (interessiNetti / poolTotale) * 100
        const fmt = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 0 })
        return (
          <div style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }} className="border rounded-lg p-4 space-y-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>
              Come nasce il rendimento del {currentSupplyAPY.toFixed(2)}% — esempio con pool da $1.000.000
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>0</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Il tasso dei borrower non è fisso: lo calcola il protocollo in base a quanta parte del pool è utilizzata.
                  {utilization <= 80 ? (<>
                  {' '}Con utilizzo al <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{utilization}%</span> — sotto la soglia dell'80% —
                  il tasso è proporzionale: <span className="font-semibold">({utilization}% ÷ 80%) × 3.8% = <span style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</span></span>.
                  Il <span className="font-semibold">3.8%</span> è la pendenza del ramo lento (<em>slope1</em>), cioè il tasso che si raggiungerebbe
                  alla soglia dell'80%. È un parametro della formula, deciso dalla governance Aave.
                  </>) : (<>
                  {' '}Con utilizzo al <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{utilization}%</span> — <span style={{ color: 'var(--bad-text)' }} className="font-semibold">oltre la soglia dell'80%</span> —
                  il tasso ha due componenti: la base di <span className="font-semibold">3.8%</span> (slope1, il massimo del ramo lento)
                  più il ramo ripido <span className="font-semibold">(({utilization}% − 80%) ÷ 20%) × 80% = {(((utilization - 80) / 20) * 80).toFixed(1)}%</span>.
                  Totale: <span className="font-semibold" style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</span>.
                  La pendenza del ramo ripido (<em>slope2</em> = 80%) è ×21 più forte — è il meccanismo di emergenza che
                  penalizza l'eccesso di prestiti e incentiva i rimborsi.
                  </>)}
                  {' '}Se prendi un prestito e l'utilizzo del pool sale, il tasso per <em>tutti</em> i borrower sale di conseguenza —
                  è il meccanismo che attira nuovi depositi e frena i prestiti quando la liquidità scarseggia.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>1</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Il pool ha <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt(poolTotale)}</span> USDC depositati in totale dai lender.
                  Al {utilization}% di utilizzo, <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>${fmt(capitalePrestato)}</span> sono in prestito
                  e <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>${fmt(poolTotale - capitalePrestato)}</span> sono fermi nel pool.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>2</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  I borrower pagano il <span className="font-semibold" style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</span> annuo
                  su <span className="font-semibold">${fmt(capitalePrestato)}</span> →
                  generano <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt(interessiLordi)}</span> di interessi in un anno.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>3</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Aave trattiene il 15%: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt(quotaAave)}</span>.
                  Ai lender restano <span className="font-semibold" style={{ color: 'var(--good-text)' }}>${fmt(interessiNetti)}</span>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>4</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Questi <span className="font-semibold" style={{ color: 'var(--good-text)' }}>${fmt(interessiNetti)}</span> si distribuiscono
                  su <em>tutti</em> i <span className="font-semibold">${fmt(poolTotale)}</span> depositati — anche quelli fermi.
                  Quindi: <span className="font-semibold">${fmt(interessiNetti)}</span> ÷ <span className="font-semibold">${fmt(poolTotale)}</span> = <span className="font-semibold" style={{ color: 'var(--good-text)' }}>{supplyAPYcheck.toFixed(2)}%</span> annuo per ogni lender.
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Spiegazione — reattiva allo slider */}
      <div style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)' }} className="border rounded-lg divide-y text-sm" >
        <div className="p-4 flex items-start justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Tasso pagato dai borrower</p>
            {utilization <= 80 ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Utilizzo al <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{utilization}%</span>, sotto la soglia dell'80%.
                Il tasso è proporzionale: a utilizzo pieno (80%) arriverebbe al massimo di <span className="font-semibold">3.8%</span>.
                Ora è al <span className="font-semibold" style={{ color: 'var(--bad-text)' }}>{(utilization / 80 * 100).toFixed(0)}%</span> di quel massimo.
              </p>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Utilizzo al <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{utilization}%</span>, <span style={{ color: 'var(--bad-text)' }} className="font-semibold">oltre la soglia dell'80%</span>.
                Sopra il kink scatta il ramo ripido (<em>slope2</em> = 80%): il tasso parte da 3.8% e aggiunge
                {' '}<span className="font-semibold">(({utilization}% − 80%) ÷ 20%) × 80% = {(((utilization - 80) / 20) * 80).toFixed(1)}%</span>,
                per un totale di <span className="font-semibold" style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</span>.
                La pendenza è ×21 più ripida del ramo lento — serve a forzare i rimborsi e proteggere i lender dalla carenza di liquidità.
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold" style={{ color: 'var(--bad-text)' }}>{currentBorrowAPY.toFixed(2)}%</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>annuo</div>
          </div>
        </div>

        <div className="p-4 flex items-start justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Tasso guadagnato dai lender</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Solo il <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{utilization}%</span> del capitale depositato è prestato e genera interessi.
              Il restante <span className="font-semibold">{100 - utilization}%</span> è fermo ma dilui­sce il rendimento.
              In più, il <span className="font-semibold">15%</span> degli interessi va al protocollo Aave.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold" style={{ color: 'var(--good-text)' }}>{currentSupplyAPY.toFixed(2)}%</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>annuo</div>
          </div>
        </div>

        <div className="p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Differenza (spread)</p>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(currentBorrowAPY - currentSupplyAPY).toFixed(2)}%</div>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gli interessi pagati dai borrower si dividono in tre parti:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
                <span style={{ color: 'var(--text-secondary)' }}>Ai lender</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: 'var(--good-text)' }}>{currentSupplyAPY.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 shrink-0" />
                <span style={{ color: 'var(--text-secondary)' }}>Al protocollo Aave (15% degli interessi sul capitale prestato)</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: 'var(--accent-text)' }}>{quotaProtocollo.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: 'var(--text-faint)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Non generati — il {100 - utilization}% del pool è fermo, nessun borrower lo usa, quindi nessun interesse viene prodotto su quella parte</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>{quotaIdle.toFixed(2)}%</span>
            </div>
          </div>
          {/* Stacked bar */}
          <div className="flex rounded overflow-hidden h-3 mt-1">
            <div className="bg-emerald-400 transition-all" style={{ width: `${(currentSupplyAPY / currentBorrowAPY) * 100}%` }} />
            <div className="bg-indigo-300 transition-all" style={{ width: `${(quotaProtocollo / currentBorrowAPY) * 100}%` }} />
            <div className="transition-all flex-1" style={{ backgroundColor: 'var(--bg-raised)' }} />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 2 — Health Factor Gauge + Simulatore
// ─────────────────────────────────────────────────────────────────────────────

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

  const hfColor = hf < 1 ? '#ef4444' : hf < 1.5 ? '#f59e0b' : '#10b981'
  const hfLabel = hf < 1 ? 'LIQUIDAZIONE' : hf < 1.5 ? 'Rischio' : 'Sicuro'

  function handleCollateralChange(val: number) {
    setCollateralETH(val)
    setBorrowedUSDC((prev) => Math.min(prev, calcMaxBorrowable(val)))
  }

  const R = 75
  const CX = 100
  const CY = 100

  function polar(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: CX - R * Math.cos(rad),
      y: CY - R * Math.sin(rad),
    }
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s = polar(startDeg)
    const e = polar(endDeg)
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 0 ${e.x} ${e.y}`
  }

  const needleEnd = polar(angle)

  return (
    <div className="space-y-4">
      {/* SVG Gauge */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-xs" aria-label="Health Factor gauge">
          <path d={arcPath(180, 0)} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
          <path d={arcPath(180, 120)} fill="none" stroke="#fca5a5" strokeWidth={14} />
          <path d={arcPath(120, 90)} fill="none" stroke="#fcd34d" strokeWidth={14} />
          <path d={arcPath(90, 0)} fill="none" stroke="#6ee7b7" strokeWidth={14} />
          <line x1={CX} y1={CY} x2={needleEnd.x} y2={needleEnd.y} stroke="var(--text-primary)" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={5} fill="var(--text-primary)" />
          <text x={CX} y={CY - 18} textAnchor="middle" fontSize={20} fontWeight="bold" fill={hfColor}>{fmtHF(hf)}</text>
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize={8} fill={hfColor}>{hfLabel}</text>
          <text x={18} y={105} textAnchor="middle" fontSize={8} fill="var(--text-muted)">0</text>
          <text x={100} y={20} textAnchor="middle" fontSize={8} fill="var(--text-muted)">1.5</text>
          <text x={182} y={105} textAnchor="middle" fontSize={8} fill="var(--text-muted)">3+</text>
        </svg>

        <div className="flex gap-3 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 inline-block" />{'< 1 Liquidazione'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" />{'1–1.5 Rischio'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />{'>1.5 Sicuro'}</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Collaterale: <span style={{ color: 'var(--text-primary)' }} className="font-medium">{collateralETH.toFixed(1)} ETH</span>
            <span style={{ color: 'var(--text-faint)' }} className="ml-2">= {fmtUSD(collateralETH * ETH_PRICE)}</span>
          </label>
          <input
            type="range" min={0} max={10} step={0.1} value={collateralETH}
            onChange={(e) => handleCollateralChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span>0 ETH</span><span>10 ETH</span>
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            USDC in prestito: <span style={{ color: 'var(--text-primary)' }} className="font-medium">{fmtUSD(borrowedUSDC)}</span>
            <span style={{ color: 'var(--text-faint)' }} className="ml-2">(max: {fmtUSD(maxBorrow)})</span>
          </label>
          <input
            type="range" min={0} max={Math.max(maxBorrow, 1)} step={100} value={borrowedUSDC}
            onChange={(e) => setBorrowedUSDC(Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span>$0</span><span>{fmtUSD(maxBorrow)} (LTV 80%)</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div style={{ backgroundColor: 'var(--good-bg)', borderColor: 'var(--good-border)' }} className="border rounded-lg p-3 text-center">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Max prestabile</div>
          <div className="font-semibold" style={{ color: 'var(--good-text)' }}>{fmtUSD(maxBorrow)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LTV 80%</div>
        </div>
        <div style={{ backgroundColor: 'var(--warn-bg)', borderColor: 'var(--warn-border)' }} className="border rounded-lg p-3 text-center">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Prezzo liquidazione</div>
          <div className="font-semibold" style={{ color: 'var(--warn-text)' }}>
            {borrowedUSDC === 0 ? '—' : fmtUSD(liqPrice)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ETH/USDC</div>
        </div>
        <div
          style={{
            backgroundColor: hf < 1 ? 'var(--bad-bg)' : hf < 1.5 ? 'var(--warn-bg)' : 'var(--good-bg)',
            borderColor: hf < 1 ? 'var(--bad-border)' : hf < 1.5 ? 'var(--warn-border)' : 'var(--good-border)',
          }}
          className="rounded-lg p-3 text-center border"
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Health Factor</div>
          <div className="font-semibold text-lg" style={{ color: hfColor }}>{fmtHF(hf)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{hfLabel}</div>
        </div>
      </div>

      {/* Reactive step-by-step calculation */}
      <div style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)' }} className="border rounded-lg p-4 overflow-x-auto">
        <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Calcolo step-by-step — Health Factor
        </p>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
              <th className="text-left pb-2 pr-4 font-medium">Step</th>
              <th className="text-left pb-2 pr-4 font-medium">Cosa calcoli</th>
              <th className="text-left pb-2 font-medium">Risultato</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr style={{ borderColor: 'var(--border)' }} className="border-t">
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-muted)' }}>1</td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>Valore collaterale in USD</td>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{fmt2(collateralETH)} ETH × {fmtUSD(ETH_PRICE)} = <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{fmtUSD(collateralETH * ETH_PRICE)}</span></td>
            </tr>
            <tr style={{ borderColor: 'var(--border)' }} className="border-t">
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-muted)' }}>2</td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>Soglia di liquidazione (LT 82.5%)</td>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{fmtUSD(collateralETH * ETH_PRICE)} × 0.825 = <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{fmtUSD(collateralETH * ETH_PRICE * LIQ_THRESHOLD)}</span></td>
            </tr>
            <tr style={{ borderColor: 'var(--border)' }} className="border-t">
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-muted)' }}>3</td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>Debito totale (USDC)</td>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}><span className="font-semibold" style={{ color: 'var(--bad-text)' }}>{fmtUSD(borrowedUSDC)}</span></td>
            </tr>
            <tr style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-subtle)' }} className="border-t">
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-muted)' }}>HF</td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>HF = soglia / debito</td>
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

const DEMO_COLLATERAL_ETH = 5
const DEMO_DEBT_USDC = 4500

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

  function hfBadgeStyle(hf: number) {
    if (hf < 1) return { backgroundColor: 'var(--bad-bg)', color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }
    if (hf < 1.5) return { backgroundColor: 'var(--warn-bg)', color: 'var(--warn-text)', borderColor: 'var(--warn-border)' }
    return { backgroundColor: 'var(--good-bg)', color: 'var(--good-text)', borderColor: 'var(--good-border)' }
  }

  const debtRepaid        = DEMO_DEBT_USDC * 0.5
  const collateralSeized  = debtRepaid * 1.05
  const collateralTotal   = DEMO_COLLATERAL_ETH * active.ethPrice
  const collateralLeft    = Math.max(0, collateralTotal - collateralSeized)
  const bonusUSD          = debtRepaid * 0.05
  const pctSeized = Math.min(100, (collateralSeized / collateralTotal) * 100)
  const pctLeft   = Math.max(0, 100 - pctSeized)

  return (
    <div className="space-y-4">
      {/* Position summary */}
      <div style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }} className="border rounded-lg p-3 text-sm" >
        <strong style={{ color: 'var(--accent-text)' }}>Posizione di esempio:</strong>{' '}
        <span style={{ color: 'var(--text-secondary)' }}>
          {DEMO_COLLATERAL_ETH} ETH come collaterale · {fmtUSD(DEMO_DEBT_USDC)} USDC in prestito ·
          Prezzo di liquidazione: <strong style={{ color: 'var(--text-primary)' }}>{fmtUSD(calcLiquidationPrice(DEMO_COLLATERAL_ETH, DEMO_DEBT_USDC))}</strong>
        </span>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        {scenarios.map((s, i) => {
          const isActive = i === scenarioIdx
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-3 border-2 ${isActive ? 'bg-indigo-500 border-indigo-600' : ''}`}
                     style={isActive ? {} : { backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)' }} />
                {i < scenarios.length - 1 && <div className="w-0.5 h-8 mt-0.5" style={{ backgroundColor: 'var(--border)' }} />}
              </div>
              <div className="flex-1 rounded-lg border p-3 mb-2 transition-all"
                   style={{
                     borderColor: isActive ? 'var(--accent-border)' : 'var(--border)',
                     backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
                   }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.note}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded border" style={hfBadgeStyle(s.hf)}>
                    HF = {fmt2(s.hf)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Button — scenario simulator */}
      <button
        onClick={() => setScenarioIdx(nextIdx)}
        className="w-full py-3 rounded-lg border-2 text-sm font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer"
        style={{
          borderColor: 'var(--accent-border)',
          backgroundColor: 'var(--accent-soft)',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent)'
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent-soft)'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--accent-border)'
        }}
      >
        <span style={{ color: 'var(--text-muted)' }} className="simula-label">Prezzo ETH corrente:</span>
        <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{fmtUSD(active.ethPrice)}</span>
        <span className="text-lg">→</span>
        <span className="font-bold">Simula crollo a {fmtUSD(nextPrice)}</span>
      </button>

      {/* Liquidation breakdown */}
      {active.hf < 1 && (
        <div style={{ backgroundColor: 'var(--bad-bg)', borderColor: 'var(--bad-border)' }} className="border-2 rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--bad-text)' }}>
            Health Factor &lt; 1 — liquidazione in corso
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
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
                className="flex items-center justify-center whitespace-nowrap px-2 transition-all"
                style={{ width: `${pctLeft}%`, backgroundColor: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
              >
                {pctLeft > 15 ? `Borrower ${pctLeft.toFixed(0)}%` : ''}
              </div>
            </div>
            <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Sequestrato dal liquidatore</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--bg-raised)' }} />Rimane al borrower</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bad-border)' }} className="rounded-lg border p-3">
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Debito ripagato dal liquidatore</div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtUSD(debtRepaid)}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>50% del debito totale</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bad-border)' }} className="rounded-lg border p-3">
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Collaterale sequestrato</div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtUSD(collateralSeized)}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--bad-text)' }}>di cui {fmtUSD(bonusUSD)} è il bonus (5%)</div>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Il borrower perde <strong style={{ color: 'var(--bad-text)' }}>{fmtUSD(bonusUSD)} in più</strong> rispetto al debito ripagato —
            è la penalità per aver lasciato scendere l'HF sotto 1. Il restante collaterale ({fmtUSD(collateralLeft)}) rimane al borrower.
          </p>
        </div>
      )}

      {/* Lender note */}
      <div style={{ backgroundColor: 'var(--good-bg)', borderColor: 'var(--good-border)' }} className="border rounded-lg p-4 text-sm">
        <strong style={{ color: 'var(--good-text)' }}>E chi ha fornito la liquidità (lender)?</strong>
        <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Il lender <strong style={{ color: 'var(--text-primary)' }}>non viene toccato</strong> dalla liquidazione del borrower.
          I suoi USDC depositati continuano a generare interesse normalmente — la liquidazione riguarda solo
          il rapporto tra borrower e protocollo. Il rischio del lender è diverso:{' '}
          <span className="font-medium" style={{ color: 'var(--warn-text)' }}>liquidity risk</span> (non riesce a ritirare se l'utilizzo
          è al 100%) e, in casi estremi,{' '}
          <span className="font-medium" style={{ color: 'var(--bad-text)' }}>insolvency risk</span> (se le liquidazioni non coprono il
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
  const apyData = MOCK_APY
  const isMock = true

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {apyData.map((row) => (
          <div key={row.symbol} style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }} className="border rounded-lg p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{row.symbol}</div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-muted)' }}>Supply APY</span>
              <span className="font-medium" style={{ color: 'var(--good-text)' }}>{row.supplyApy.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Borrow APY</span>
              <span className="font-medium" style={{ color: 'var(--bad-text)' }}>{row.borrowApy.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
      {isMock && (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          * Dati di esempio — il feed live non è disponibile in questo ambiente.
          I tassi reali variano continuamente su{' '}
          <span style={{ color: 'var(--text-secondary)' }}>app.aave.com</span>.
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
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Parte 1 — Curva di Utilizzo e Tassi di Interesse
        </p>
        <UtilizationCurve />
      </div>

      <div style={{ borderColor: 'var(--border-subtle)' }} className="border-t" />

      {/* Parte 2 */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Parte 2 — Simulatore Health Factor
        </p>
        <HealthFactorGauge />
      </div>

      <div style={{ borderColor: 'var(--border-subtle)' }} className="border-t" />

      {/* Parte 3 */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Parte 3 — Scenari di Liquidazione
        </p>
        <LiquidationTimeline />
      </div>

      <div style={{ borderColor: 'var(--border-subtle)' }} className="border-t" />

      {/* Parte 4 */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Parte 4 — APY in tempo reale (Aave V3)
        </p>
        <LiveApyData />
      </div>

    </div>
  )
}
