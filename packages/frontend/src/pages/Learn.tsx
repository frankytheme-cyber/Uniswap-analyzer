import { useState, useEffect, useRef } from 'react'
import {
  TrendUpIcon, TargetIcon, ShoppingCartIcon, WarningIcon,
  ArrowsCounterClockwiseIcon, ArrowRightIcon, WavesIcon, BankIcon,
} from '@phosphor-icons/react'
import LiquidityCurveChart        from '../components/learn/LiquidityCurveChart.tsx'
import ConcentratedLiquidityChart from '../components/learn/ConcentratedLiquidityChart.tsx'
import PriceImpactChart           from '../components/learn/PriceImpactChart.tsx'
import RebalancingTimeline        from '../components/learn/RebalancingTimeline.tsx'
import ILManualSimulator          from '../components/charts/ILManualSimulator.tsx'
import AaveLendingChart           from '../components/learn/AaveLendingChart.tsx'
import Footer                     from '../components/Footer.tsx'

interface Chapter {
  id: string
  number: string
  title: string
  subtitle: string
  Icon: React.ElementType
}

const chapters: Chapter[] = [
  { id: 'amm',          number: '01', title: 'La Curva AMM',             subtitle: 'x · y = k con ETH/USDC',         Icon: TrendUpIcon },
  { id: 'concentrated', number: '02', title: 'Liquidità Concentrata V3', subtitle: 'Più efficienza, stesso capitale', Icon: TargetIcon },
  { id: 'impact',       number: '03', title: 'Comprare un Token',        subtitle: 'Price impact e slippage',         Icon: ShoppingCartIcon },
  { id: 'il',           number: '04', title: 'Impermanent Loss',         subtitle: 'Il rischio nascosto degli LP',    Icon: WarningIcon },
  { id: 'rebalancing',  number: '05', title: 'Il Ribilanciamento',       subtitle: 'Quando e come ricalibrare',       Icon: ArrowsCounterClockwiseIcon },
  { id: 'lending',     number: '06', title: 'Prestiti & Collaterale',  subtitle: 'Come funziona Aave e il Health Factor', Icon: BankIcon },
]

export default function Learn() {
  const [activeChapter, setActiveChapter] = useState('amm')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-chapter')
          if (id) setActiveChapter(id)
        }
      },
      { threshold: 0.3 },
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* NavBar rendered by App layout */}

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8 flex-1 w-full">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <p className="text-xs text-slate-400 uppercase tracking-wider pb-3 px-3">Capitoli</p>
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => scrollTo(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  activeChapter === ch.id
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-mono text-slate-300 mr-2">{ch.number}</span>
                {ch.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-20">

          {/* Pool setup callout */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 flex items-start gap-3">
            <WavesIcon size={20} weight="duotone" className="text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-violet-700 mb-1">La nostra pool di esempio</p>
              <p className="text-sm text-slate-600">
                Per tutta questa guida useremo la pool <strong className="text-slate-800">ETH / USDC</strong> come esempio:
                100 ETH + 200,000 USDC, prezzo ETH = <strong className="text-slate-800">$2,000</strong>, fee tier 0.30%.
                I grafici sono interattivi: muovi gli slider per sperimentare!
              </p>
            </div>
          </div>

          {/* ── Chapter 1: La Curva AMM ── */}
          <section
            id="amm" data-chapter="amm"
            ref={(el: HTMLElement | null) => { sectionRefs.current['amm'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[0]} />
            <p className="text-slate-600 leading-relaxed mb-2">
              Un Automated Market Maker (AMM) non usa un order book. Al suo posto usa una formula matematica:
              <span className="text-slate-900 font-mono font-semibold"> x · y = k</span>. La formula considera il{' '}
              <em>numero di token</em>, non il loro valore in dollari.
            </p>
            {/* Pool composition table */}
            <div className="card overflow-hidden mb-2">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Composizione della Pool</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-500 w-16">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 font-mono font-semibold text-xs">x</span>
                    </td>
                    <td className="py-3 text-slate-600">Riserva Token A <span className="text-slate-400 text-xs">(ETH)</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">100 <span className="text-slate-400 font-normal text-xs">ETH</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600 font-mono font-semibold text-xs">y</span>
                    </td>
                    <td className="py-3 text-slate-600">Riserva Token B <span className="text-slate-400 text-xs">(USDC)</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">200,000 <span className="text-slate-400 font-normal text-xs">USDC</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Formula derivations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Prodotto Costante</p>
                <div className="font-mono text-sm text-slate-600 space-y-1 mb-3">
                  <p><span className="text-amber-600 font-semibold">k</span> = <span className="text-indigo-600">x</span> × <span className="text-blue-600">y</span></p>
                  <p><span className="text-amber-600 font-semibold">k</span> = <span className="text-indigo-600">100</span> × <span className="text-blue-600">200,000</span></p>
                </div>
                <div className="border-t border-slate-100 pt-3 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-amber-600 font-semibold">k =</span>
                  <span className="font-mono text-lg font-bold text-amber-600">20,000,000</span>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Prezzo Derivato</p>
                <div className="font-mono text-sm text-slate-600 space-y-1 mb-3">
                  <p><span className="text-emerald-600 font-semibold">P</span> = <span className="text-blue-600">y</span> / <span className="text-indigo-600">x</span></p>
                  <p><span className="text-emerald-600 font-semibold">P</span> = <span className="text-blue-600">200,000</span> / <span className="text-indigo-600">100</span></p>
                </div>
                <div className="border-t border-slate-100 pt-3 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-emerald-600 font-semibold">P =</span>
                  <span className="font-mono text-lg font-bold text-emerald-600">2,000</span>
                  <span className="text-xs text-slate-400">USDC / ETH</span>
                </div>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed mb-6">
              Quando compri ETH, ne togli dalla pool → x diminuisce → y deve aumentare per mantenere k costante → il
              prezzo di ETH sale. Più grande è l'ordine rispetto alla liquidità, maggiore è il{' '}
              <span className="text-amber-600 font-medium">price impact</span>. Prova a simulare un acquisto e segui il calcolo step-by-step per capire cosa succede.
            </p>
            <div className="card p-4">
              <LiquidityCurveChart />
            </div>
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
              <strong className="text-slate-700">Come leggere il grafico:</strong> la curva è l'iperbole x · y = k.
              Il punto <span className="text-indigo-600 font-medium">viola</span> è lo stato attuale della pool (quanti ETH e USDC contiene).
              Muovi gli slider per simulare un acquisto: il punto <span className="text-amber-500 font-medium">ambra</span>{' '}
              mostra dove si sposta. Il blocco di calcolo sotto mostra ogni passaggio della formula.
            </div>

            {/* Arbitrage callout */}
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-600">
              <strong className="text-blue-700">Punto chiave:</strong> l'AMM non guarda il prezzo di mercato esterno (Binance, Coinbase, ecc.).
              Guarda solo le quantità dei token nella pool. Il prezzo viene riallineato dagli{' '}
              <strong className="text-slate-800">arbitraggisti</strong>: quando il prezzo sulla pool diverge dal mercato,
              comprano o vendono per incassare la differenza, riportando il prezzo in linea con i CEX.
            </div>
          </section>

          {/* ── Chapter 2: Liquidità Concentrata V3 ── */}
          <section
            id="concentrated" data-chapter="concentrated"
            ref={(el: HTMLElement | null) => { sectionRefs.current['concentrated'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[1]} />
            <p className="text-slate-600 leading-relaxed mb-4">
              In Uniswap V2, se depositi nella pool ETH/USDC, la liquidità è distribuita
              uniformemente su tutti i prezzi possibili, da $0 a infinito. La maggior parte del capitale è{' '}
              <span className="text-slate-900 font-medium">inattiva</span>: lavora solo la liquidità vicina al prezzo corrente.
              In V3 puoi scegliere un <span className="text-slate-900 font-medium">range di prezzo</span> e concentrare il capitale dove serve.
            </p>

            {/* V2 vs V3 comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="card p-4 border-l-2 border-l-indigo-300">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Uniswap V2 — Full Range</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deposito</span>
                    <span className="font-mono font-semibold text-slate-800">$400,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Range</span>
                    <span className="font-mono text-slate-600">$0 → ∞</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capitale attivo</span>
                    <span className="font-mono font-semibold text-red-500">~5%</span>
                  </div>
                </div>
              </div>
              <div className="card p-4 border-l-2 border-l-emerald-400">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Uniswap V3 — Concentrata</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deposito</span>
                    <span className="font-mono font-semibold text-slate-800">$400,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Range</span>
                    <span className="font-mono text-slate-600">$1,600 → $2,400</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capitale attivo</span>
                    <span className="font-mono font-semibold text-emerald-600">~100%</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">
              Stessa quantità di capitale, ma molte più fee perché ogni swap trova più profondità nel range.
              Il trade-off: se ETH esce dal range, la posizione smette di guadagnare.
              Usa lo slider per vedere come la larghezza del range influenza l'efficienza.
            </p>
            <div className="card p-4">
              <ConcentratedLiquidityChart />
            </div>
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
              <strong className="text-slate-700">Come leggere il grafico:</strong> confronto tra{' '}
              <span className="text-indigo-600 font-medium">liquidità V2 uniforme</span> (barre viola chiaro) vs{' '}
              <span className="text-emerald-600 font-medium">liquidità V3 concentrata</span> (barre verdi).
              La barra più alta al prezzo attuale di ETH ($2,000) significa più profondità → meno slippage per i trader → più fee per gli LP.
              Restringi il range con lo slider per vedere l'efficienza aumentare.
            </div>
          </section>

          {/* ── Chapter 3: Comprare un Token ── */}
          <section
            id="impact" data-chapter="impact"
            ref={(el: HTMLElement | null) => { sectionRefs.current['impact'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[2]} />
            <p className="text-slate-600 leading-relaxed mb-4">
              Un trader vuole comprare ETH dalla pool. L'ordine "consuma" liquidità dal prezzo corrente verso l'alto,
              spostando il prezzo durante l'esecuzione. Più grande è l'ordine, più il prezzo si muove.
            </p>

            {/* Trade example */}
            <div className="card overflow-hidden mb-3">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Esempio: acquisto ETH</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500">Ordine</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">$10,000</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500">Prezzo spot</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">$2,000 / ETH</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">ETH attesi (ideale)</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-indigo-600">5.000 ETH</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fee tiers */}
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Fee Tier disponibili</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="px-4 py-3 text-center">
                  <p className="font-mono text-lg font-bold text-emerald-600">0.05%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Stablecoin</p>
                </div>
                <div className="px-4 py-3 text-center bg-emerald-50/50">
                  <p className="font-mono text-lg font-bold text-emerald-600">0.30%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Standard</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="font-mono text-lg font-bold text-emerald-600">1.00%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Exotic</p>
                </div>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">
              La fee va direttamente agli LP attivi nel range.
              Prova a cambiare la dimensione dell'ordine e il fee tier per vedere l'effetto.
            </p>
            <div className="card p-4">
              <PriceImpactChart />
            </div>
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
              <strong className="text-slate-700">Come leggere il grafico:</strong> la curva ad area rappresenta la profondità
              della liquidità ETH/USDC a vari prezzi. La linea di riferimento{' '}
              <span className="text-amber-500 font-medium">gialla</span> è il prezzo corrente ($2,000).
              La linea tratteggiata <span className="text-red-500 font-medium">rossa</span> mostra dove si sposta il prezzo
              dopo il tuo acquisto. Aumenta l'ordine per vedere come il price impact cresce.
            </div>
          </section>

          {/* ── Chapter 4: Impermanent Loss ── */}
          <section
            id="il" data-chapter="il"
            ref={(el: HTMLElement | null) => { sectionRefs.current['il'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[3]} />
            <p className="text-slate-600 leading-relaxed mb-4">
              L'<span className="text-slate-900 font-medium">Impermanent Loss</span> (IL) è la perdita di valore che subisce un
              LP rispetto al semplice HODL dei due token. L'AMM ribilancia automaticamente la posizione:
              vendi il token che sale e compri quello che scende. Vediamo un esempio concreto.
            </p>

            {/* IL scenario: before → after */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Deposito iniziale</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ETH</span>
                    <span className="font-mono font-semibold text-slate-800">100 <span className="text-slate-400 font-normal text-xs">@ $2,000</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">USDC</span>
                    <span className="font-mono font-semibold text-slate-800">100,000</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between">
                    <span className="text-slate-500">Totale</span>
                    <span className="font-mono font-bold text-slate-800">$300,000</span>
                  </div>
                </div>
              </div>
              <div className="card p-4 border-l-2 border-l-red-300">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Dopo ETH +25% → $2,500</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">LP ha</span>
                    <span className="font-mono text-slate-600">meno ETH, più USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HODL varrebbe</span>
                    <span className="font-mono font-semibold text-emerald-600">$350,000</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between">
                    <span className="text-slate-500">IL</span>
                    <span className="font-mono font-bold text-red-500">−0.6%</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">
              In V3 con range concentrato, l'IL è <span className="text-red-600 font-medium">amplificato</span>:
              range stretto = più fee ma anche più IL. La domanda chiave:{' '}
              <em className="text-slate-700">le fee coprono l'IL?</em> Usa il simulatore per testare.
            </p>
            <div className="card p-4">
              <ILManualSimulator
                token0="ETH"
                token1="USDC"
                currentPrice={2000}
                initialFeeAPR={15}
              />
            </div>
          </section>

          {/* ── Chapter 5: Il Ribilanciamento ── */}
          <section
            id="rebalancing" data-chapter="rebalancing"
            ref={(el: HTMLElement | null) => { sectionRefs.current['rebalancing'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[4]} />
            <p className="text-slate-600 leading-relaxed mb-4">
              Quando ETH esce dal tuo range (es. sopra $2,200 con un range stretto ±10%), la posizione smette di guadagnare fee.
              Il <span className="text-slate-900 font-medium">ribilanciamento</span> significa chiudere la posizione e riaprirla
              con un nuovo range attorno al prezzo attuale. Ma attenzione: il rebalancing ha un costo nascosto.
            </p>

            {/* Rebalancing impact — Spinoglio 2024 */}
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Impatto del rebalancing frequente <span className="normal-case text-slate-300">— Spinoglio 2024, ETH/USDC</span></p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Impermanent Loss</p>
                  <p className="font-mono text-2xl font-bold text-red-500">5×</p>
                  <p className="text-xs text-slate-400 mt-1">moltiplicato</p>
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Fee guadagnate</p>
                  <p className="font-mono text-2xl font-bold text-emerald-600">1.5×</p>
                  <p className="text-xs text-slate-400 mt-1">moltiplicato</p>
                </div>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">
              Il trade-off è sfavorevole: l'IL cresce molto più delle fee.
              Nel grafico sotto, attiva le strategie per vedere dove ognuna esce dal range e richiede un rebalancing.
            </p>
            <div className="card p-4">
              <RebalancingTimeline />
            </div>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              <strong>Conclusione:</strong> non esiste la strategia perfetta. Un range stretto ($1,800–$2,200) massimizza le fee nel
              mercato laterale ma richiede costosi rebalancing nei trend forti. Un range largo ($1,200–$2,600) riduce il rischio
              ma diluisce le fee. Usa il <strong>Backtesting</strong> nel tool per testare le strategie sui dati reali della tua pool.
            </div>
          </section>

          {/* ── Chapter 6: Prestiti & Collaterale ── */}
          <section
            id="lending" data-chapter="lending"
            ref={(el: HTMLElement | null) => { sectionRefs.current['lending'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[5]} />
            <p className="text-slate-600 leading-relaxed mb-2">
              I protocolli di <span className="text-slate-900 font-medium">lending</span> come Aave permettono di depositare
              un asset come collaterale e prendere in prestito un altro asset. Non c'è una controparte diretta:
              un algoritmo regola i tassi di interesse in tempo reale in base all'utilizzo del pool di liquidità.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Il tasso di interesse non è fisso: cresce lentamente finché l'utilizzo è basso, poi sale
              <span className="text-slate-900 font-medium"> bruscamente</span> dopo una soglia chiamata{' '}
              <span className="text-amber-600 font-medium">kink</span> (tipicamente all'80%). Questo meccanismo incentiva
              i borrower a restituire il prestito e i lender a depositare di più quando la domanda è alta.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Il parametro più critico è l'<span className="text-slate-900 font-medium">Health Factor</span>: un numero che
              misura la salute della tua posizione. Scende quando il valore del collaterale diminuisce o il debito aumenta.
            </p>

            {/* Health Factor thresholds */}
            <div className="card overflow-hidden mb-6">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Health Factor — zone di rischio</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 font-mono font-semibold text-xs">HF</span>
                    </td>
                    <td className="py-3 text-slate-600">Sopra <strong className="text-slate-800">1.5</strong></td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">Prudente</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-50 text-amber-600 font-mono font-semibold text-xs">HF</span>
                    </td>
                    <td className="py-3 text-slate-600">Tra <strong className="text-slate-800">1.0</strong> e <strong className="text-slate-800">1.2</strong></td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">Aggiungi collaterale</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600 font-mono font-semibold text-xs">HF</span>
                    </td>
                    <td className="py-3 text-slate-600">Sotto <strong className="text-slate-800">1.0</strong></td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-full px-2.5 py-1">Liquidazione (bonus 5%)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card p-4">
              <AaveLendingChart />
            </div>
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-slate-600">
              <strong className="text-red-700">Rischio chiave:</strong> il collaterale viene rivalutato in tempo reale.
              Un crollo del prezzo di ETH riduce il tuo Health Factor senza che tu faccia nulla.
              Mantieni sempre un cuscinetto: un HF sopra <strong className="text-slate-800">1.5</strong> è considerato prudente.
              Sotto <strong className="text-slate-800">1.2</strong> è consigliabile aggiungere collaterale o ridurre il debito.
            </div>
          </section>

          {/* CTA */}
          <div className="border-t border-slate-200 pt-12 pb-8 text-center space-y-4">
            <p className="text-slate-500 text-sm">Pronto ad analizzare le pool reali?</p>
            <a
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-2"
            >
              Vai al tool <ArrowRightIcon size={14} weight="bold" />
            </a>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

function ChapterHeader({ ch }: { ch: Chapter }) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="w-11 h-11 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-center shrink-0">
        <ch.Icon size={22} weight="duotone" className="text-violet-600" />
      </div>
      <div>
        <div className="text-xs font-mono text-violet-500 mb-0.5">{ch.number}</div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{ch.title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{ch.subtitle}</p>
      </div>
    </div>
  )
}
