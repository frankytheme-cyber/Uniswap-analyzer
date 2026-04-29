import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CurrencyEthIcon, ShieldCheckIcon,
  ArrowRightIcon, ArrowLeftIcon, LinkIcon,
} from '@phosphor-icons/react'
import GasFeeChart               from '../components/learn/GasFeeChart.tsx'
import ConsensusComparisonChart  from '../components/learn/ConsensusComparisonChart.tsx'
import Footer                    from '../components/Footer.tsx'
import SEO                       from '../components/SEO.tsx'

interface Chapter {
  id: string
  number: string
  title: string
  subtitle: string
  Icon: React.ElementType
}

const chapters: Chapter[] = [
  { id: 'ethereum', number: '09', title: 'La Blockchain Ethereum', subtitle: 'Smart contract, EVM e gas',           Icon: CurrencyEthIcon },
  { id: 'pos',      number: '10', title: 'Proof of Stake',         subtitle: 'Validatori, staking e The Merge',     Icon: ShieldCheckIcon },
]

export default function LearnEthereum() {
  const [activeChapter, setActiveChapter] = useState('ethereum')
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      <SEO
        title="La Blockchain Ethereum — Smart Contract, Gas, Proof of Stake"
        description="Guida interattiva con grafici: come funziona la blockchain Ethereum, gli smart contract, l'EVM, il gas EIP-1559 e il Proof of Stake."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Guida alla Blockchain Ethereum: Smart Contract, Gas e Proof of Stake',
          description: 'Come funziona la blockchain Ethereum, gli smart contract, il gas EIP-1559 e il Proof of Stake',
          author: { '@type': 'Person', name: 'Simone Puliti', url: 'https://simonepuliti.dev' },
          publisher: { '@type': 'Person', name: 'Simone Puliti' },
        }}
      />
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8 flex-1 w-full">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <Link
              to="/learn"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-4 px-3"
            >
              <ArrowLeftIcon size={11} weight="bold" />
              Tutte le sezioni
            </Link>
            <p className="text-xs text-slate-400 uppercase tracking-wider pb-3 px-3">Capitoli</p>
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => scrollTo(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  activeChapter === ch.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xs font-mono text-slate-300 dark:text-slate-600 mr-2">{ch.number}</span>
                {ch.title}
              </button>
            ))}

            {/* Links to other learn sections */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 px-3">Altre guide</p>
              <Link
                to="/learn/blockchain"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Bitcoin & Proof of Work <ArrowRightIcon size={10} weight="bold" />
              </Link>
              <Link
                to="/learn/dex"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                Pool di Liquidità <ArrowRightIcon size={10} weight="bold" />
              </Link>
              <Link
                to="/learn/lending"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Prestiti & Collaterale <ArrowRightIcon size={10} weight="bold" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-20">

          {/* Intro callout */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <LinkIcon size={20} weight="duotone" className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Da Bitcoin a Ethereum</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Bitcoin ha dimostrato che una blockchain funziona per trasferire valore. <strong className="text-slate-800 dark:text-slate-100">Ethereum</strong>{' '}
                ha fatto il passo successivo: eseguire <strong className="text-slate-800 dark:text-slate-100">programmi</strong> sulla blockchain.
                In questa guida esploriamo gli smart contract, il gas EIP-1559 e il <strong className="text-slate-800 dark:text-slate-100">Proof of Stake</strong>.
                I grafici sono interattivi: sperimenta!
              </p>
            </div>
          </div>

          {/* ── Chapter 09: La Blockchain Ethereum ── */}
          <section
            id="ethereum" data-chapter="ethereum"
            ref={(el: HTMLElement | null) => { sectionRefs.current['ethereum'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[0]} />
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ethereum ha esteso l'idea di Bitcoin: oltre a trasferire valore, permette di deployare{' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium">smart contract</span> — programmi
              memorizzati sulla blockchain il cui codice e stato sono pubblici e verificabili da tutta la rete.
              Chiunque può interagire con uno smart contract inviando una transazione che ne invoca una funzione.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              A differenza di Bitcoin (modello UTXO), Ethereum usa un modello ad{' '}
              <strong className="text-slate-800 dark:text-slate-100">account</strong>: ogni indirizzo ha un saldo, un nonce
              (contatore transazioni) e, se è uno smart contract, anche codice e storage. L'
              <span className="text-blue-600 dark:text-blue-400 font-medium">EVM</span> (Ethereum Virtual Machine)
              è il computer globale che esegue il codice degli smart contract su ogni nodo della rete.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ma eseguire codice costa risorse. Per evitare abusi, Ethereum usa il concetto di{' '}
              <span className="text-amber-600 dark:text-amber-400 font-medium">gas</span>: ogni operazione ha un costo in gas
              e l'utente paga una fee in ETH proporzionale al gas usato. Dal 2021, con l'aggiornamento{' '}
              <strong className="text-slate-800 dark:text-slate-100">EIP-1559</strong>, le fee funzionano così:
            </p>
            {/* EIP-1559 fee breakdown */}
            <div className="card overflow-hidden mb-2">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">EIP-1559 — struttura delle fee</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3 w-32">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-mono font-semibold text-xs">base fee</span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">Calcolata dal protocollo. Sale se blocchi &gt;50% pieni, scende se vuoti.</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-full px-2.5 py-1">Bruciata</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-semibold text-xs">priority</span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">Mancia volontaria per avere priorità nell'inclusione.</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-2.5 py-1">Al validatore</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono font-semibold text-xs">totale</span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300" colSpan={2}>
                      <span className="font-mono text-xs">base fee + priority fee</span> — la base fee bruciata rende ETH potenzialmente <span className="text-slate-800 dark:text-slate-100 font-medium">deflazionario</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Il grafico simula come la base fee si adatta alla domanda: prova ad alzare il livello di utilizzo dei blocchi e osserva la fee crescere.
            </p>
            <div className="card p-4">
              <GasFeeChart />
            </div>
            <div className="mt-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-200">Come leggere il grafico:</strong> la linea{' '}
              <span className="text-amber-500 font-medium">ambra</span> è la base fee, l'area{' '}
              <span className="text-blue-500 font-medium">blu</span> è la fee totale (base + priority).
              Quando la domanda supera il 50%, la base fee sale blocco dopo blocco. Questo meccanismo
              crea un mercato efficiente per lo spazio nei blocchi.
            </div>
            <div className="mt-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-indigo-700 dark:text-indigo-400">Smart contract in pratica:</strong> Uniswap, Aave, e tutte le app DeFi
              che analizziamo in questo sito sono smart contract su Ethereum. Quando fai uno swap su Uniswap,
              stai inviando una transazione allo smart contract della pool, che esegue la formula AMM ed effettua lo scambio.
              Tutto on-chain, tutto verificabile.
            </div>
          </section>

          {/* ── Chapter 10: Proof of Stake ── */}
          <section
            id="pos" data-chapter="pos"
            ref={(el: HTMLElement | null) => { sectionRefs.current['pos'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[1]} />
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Il <strong className="text-slate-800 dark:text-slate-100">Proof of Stake</strong> (PoS) è un meccanismo di consenso
              alternativo al PoW. Invece di consumare energia per trovare un hash, i partecipanti bloccano ("stakano")
              ETH come garanzia. Il protocollo seleziona casualmente un validatore per proporre ogni blocco.
            </p>

            {/* PoS key parameters */}
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Parametri chiave del PoS Ethereum</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Stake minimo</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">32 <span className="text-slate-400 font-normal text-xs">ETH</span></td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Tempo per slot</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">12 <span className="text-slate-400 font-normal text-xs">secondi</span></td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Finalità</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">2 epoche <span className="text-slate-400 font-normal text-xs">(~12.8 min)</span></td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Soglia attacco</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-500 dark:text-red-400">33% <span className="text-slate-400 font-normal text-xs">dello stake (~$30B)</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">The Merge</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">15 set 2022 <span className="text-slate-400 font-normal text-xs">(−99.95% energia)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              La sicurezza è garantita dallo <span className="text-red-600 dark:text-red-400 font-medium">slashing</span>:
              se un validatore si comporta in modo disonesto, il protocollo gli confisca parte dello stake.
              La probabilità di proporre un blocco è proporzionale all'ETH stakato.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Usa il confronto e il simulatore qui sotto per esplorare le differenze tra PoW e PoS.
            </p>
            <div className="card p-4">
              <ConsensusComparisonChart />
            </div>
            <div className="mt-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-200">Come usare il grafico:</strong> nella tab "Confronto Metriche"
              vedi le differenze chiave tra PoW e PoS. Nella tab "Selezione Validatore", regola il tuo stake con lo slider
              e premi "Simula Epoca" per vedere chi viene selezionato come block proposer. Più ETH staki, maggiore la probabilità
              di essere scelto.
            </div>
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-amber-700 dark:text-amber-400">Conclusione:</strong> PoW e PoS risolvono lo stesso problema
              (impedire che un attaccante crei blocchi falsi) con approcci diversi.
              PoW usa il costo energetico come barriera, PoS usa il capitale economico.
              Ethereum ha scelto PoS per la sostenibilità, mantenendo un livello di sicurezza
              comparabile grazie al meccanismo di slashing.
            </div>
          </section>

          {/* CTA section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-10 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Continua a esplorare:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/learn/blockchain"
                className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700 rounded-lg p-4 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowRightIcon size={16} weight="bold" className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Bitcoin & PoW</div>
                  <div className="text-xs text-slate-400">Blocchi, hash, mining</div>
                </div>
              </Link>
              <Link
                to="/learn/dex"
                className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 rounded-lg p-4 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowRightIcon size={16} weight="bold" className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Pool di Liquidità</div>
                  <div className="text-xs text-slate-400">AMM, liquidità concentrata V3, impermanent loss</div>
                </div>
              </Link>
              <Link
                to="/learn/lending"
                className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 rounded-lg p-4 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowRightIcon size={16} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Prestiti & Collaterale</div>
                  <div className="text-xs text-slate-400">Tassi, Health Factor, liquidazione</div>
                </div>
              </Link>
            </div>
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
      <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-center shrink-0">
        <ch.Icon size={22} weight="duotone" className="text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <div className="text-xs font-mono text-blue-500 dark:text-blue-400 mb-0.5">{ch.number}</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{ch.title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{ch.subtitle}</p>
      </div>
    </div>
  )
}
