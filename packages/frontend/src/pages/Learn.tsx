import { useState, useEffect, useRef } from 'react'
import LiquidityCurveChart        from '../components/learn/LiquidityCurveChart.tsx'
import ConcentratedLiquidityChart from '../components/learn/ConcentratedLiquidityChart.tsx'
import PriceImpactChart           from '../components/learn/PriceImpactChart.tsx'
import RebalancingTimeline        from '../components/learn/RebalancingTimeline.tsx'
import ILManualSimulator          from '../components/charts/ILManualSimulator.tsx'
import NavBar                     from '../components/NavBar.tsx'

type View = 'home' | 'dashboard' | 'discover' | 'learn'

interface LearnProps {
  onBack: () => void
  onNavigate: (v: View) => void
}

interface Chapter {
  id: string
  number: string
  title: string
  subtitle: string
  icon: string
}

const chapters: Chapter[] = [
  { id: 'amm',          number: '01', title: 'La Curva AMM',             subtitle: 'x · y = k con ETH/USDC',            icon: '📈' },
  { id: 'concentrated', number: '02', title: 'Liquidità Concentrata V3', subtitle: 'Più efficienza, stesso capitale',     icon: '🎯' },
  { id: 'impact',       number: '03', title: 'Comprare un Token',         subtitle: 'Price impact e slippage',            icon: '🛒' },
  { id: 'il',           number: '04', title: 'Impermanent Loss',          subtitle: 'Il rischio nascosto degli LP',        icon: '⚠️' },
  { id: 'rebalancing',  number: '05', title: 'Il Ribilanciamento',        subtitle: 'Quando e come ricalibrare',          icon: '⟳'  },
]

export default function Learn({ onBack, onNavigate }: LearnProps) {
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
    <div className="min-h-screen bg-slate-50">
      <NavBar
        view="learn"
        onNavigate={onNavigate}
        leftContent={
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-700 transition-colors text-sm shrink-0"
            >
              ← Home
            </button>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <span className="text-slate-700 font-semibold text-sm truncate">Come Funziona una Pool</span>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 px-3">Capitoli</p>
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
            <span className="text-lg">🏊</span>
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
            <p className="text-slate-600 leading-relaxed mb-2">
              Nella nostra pool: <strong className="text-slate-800">x</strong> = 100 ETH,{' '}
              <strong className="text-slate-800">y</strong> = 200,000 USDC.
              Quindi <span className="text-slate-900 font-mono">k = 100 × 200,000 = 20,000,000</span>.
              Il prezzo di ETH si ricava dal rapporto:{' '}
              <span className="text-slate-900 font-mono">P = y/x = 200,000/100 = 2,000 USDC</span>.
            </p>
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
            <p className="text-slate-600 leading-relaxed mb-2">
              In Uniswap V2, se depositi $400,000 nella pool ETH/USDC (200 ETH + 200,000 USDC), la liquidità è distribuita
              uniformemente su tutti i prezzi possibili, da $0 a infinito. La maggior parte del capitale è{' '}
              <span className="text-slate-900 font-medium">inattiva</span>: lavora solo la liquidità vicina al prezzo corrente.
            </p>
            <p className="text-slate-600 leading-relaxed mb-2">
              In Uniswap V3 puoi scegliere un <span className="text-slate-900 font-medium">range di prezzo</span>:
              ad esempio $1,600–$2,400 (±20% da $2,000). Tutta la tua liquidità è concentrata dove il prezzo scambia di più.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Risultato: la stessa quantità di capitale genera <span className="text-emerald-600 font-medium">molte più fee</span>{' '}
              perché ogni swap trova più profondità nel range. Il trade-off: se ETH esce dal range, la posizione smette di guadagnare fee.
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
            <p className="text-slate-600 leading-relaxed mb-2">
              Un trader vuole comprare $10,000 di ETH dalla pool. A $2,000/ETH dovrebbe ottenere 5 ETH a prezzo spot.
              Ma l'ordine "consuma" liquidità dal prezzo corrente verso l'alto, spostando il prezzo durante l'esecuzione.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Con una pool liquida e range concentrato, anche ordini grandi subiscono poco slippage. Con pool poco liquide,
              il prezzo si sposta molto con ordini relativamente piccoli. Ogni swap paga una{' '}
              <span className="text-emerald-600 font-medium">fee</span> (0.05%, 0.30% o 1.00%) che va direttamente agli LP
              attivi nel range. Prova a cambiare la dimensione dell'ordine e il fee tier per vedere l'effetto.
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
            <p className="text-slate-600 leading-relaxed mb-2">
              L'<span className="text-slate-900 font-medium">Impermanent Loss</span> (IL) è la perdita di valore che subisce un
              LP rispetto al semplice HODL dei due token. Se depositi $200,000 nella pool ETH/USDC
              (100 ETH a $2,000 + 100,000 USDC) e ETH sale del 25% a $2,500, l'AMM ribilancia automaticamente:
              vendi ETH e compri USDC per mantenere il rapporto. Il risultato è che hai meno ETH di quanti ne avresti con un semplice HODL.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              In V3 con range concentrato, l'IL è <span className="text-red-600 font-medium">amplificato</span> rispetto a V2:
              range stretto = più fee ma anche più IL. La domanda chiave è:{' '}
              <em className="text-slate-700">le fee coprono l'IL?</em> Usa il simulatore qui sotto per testare:
              imposta il range e i prezzi di uscita, e guarda quanti giorni servono per recuperare la perdita con le fee.
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
            <p className="text-slate-600 leading-relaxed mb-2">
              Quando ETH esce dal tuo range (es. sopra $2,200 con un range stretto ±10%), la posizione smette di guadagnare fee.
              Il <span className="text-slate-900 font-medium">ribilanciamento</span> significa chiudere la posizione e riaprirla
              con un nuovo range attorno al prezzo attuale.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Ribilanciare troppo spesso <span className="text-red-600 font-medium">moltiplica l'IL</span> e aggiunge costi di
              gas. Ricerche empiriche (Spinoglio 2024 su ETH/USDC Uniswap V3) mostrano che il rebalancing frequente moltiplica l'IL fino a{' '}
              <strong className="text-slate-900">5×</strong> a fronte di un aumento delle fee di soli{' '}
              <strong className="text-slate-900">1.5×</strong>. Nel grafico sotto, attiva le strategie per vedere dove ognuna esce dal range e
              richiede un rebalancing.
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

          {/* CTA */}
          <div className="border-t border-slate-200 pt-12 pb-8 text-center space-y-4">
            <p className="text-slate-500 text-sm">Pronto ad analizzare le pool reali?</p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="btn-primary inline-flex items-center gap-2"
            >
              Vai al tool →
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

function ChapterHeader({ ch }: { ch: Chapter }) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="w-11 h-11 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-center text-xl shrink-0">
        {ch.icon}
      </div>
      <div>
        <div className="text-xs font-mono text-violet-500 mb-0.5">{ch.number}</div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{ch.title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{ch.subtitle}</p>
      </div>
    </div>
  )
}
