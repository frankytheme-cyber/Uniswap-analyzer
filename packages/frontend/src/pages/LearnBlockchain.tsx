import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CubeIcon, HammerIcon, CurrencyEthIcon, ShieldCheckIcon,
  ArrowRightIcon, ArrowLeftIcon, LinkIcon,
} from '@phosphor-icons/react'
import BlockStructureChart       from '../components/learn/BlockStructureChart.tsx'
import MiningSimulatorChart      from '../components/learn/MiningSimulatorChart.tsx'
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
  { id: 'bitcoin',  number: '07', title: 'La Blockchain Bitcoin',   subtitle: 'Blocchi, hash e immutabilità',       Icon: CubeIcon },
  { id: 'pow',      number: '08', title: 'Proof of Work',          subtitle: 'Mining, nonce e difficoltà',          Icon: HammerIcon },
  { id: 'ethereum', number: '09', title: 'La Blockchain Ethereum', subtitle: 'Smart contract, EVM e gas',           Icon: CurrencyEthIcon },
  { id: 'pos',      number: '10', title: 'Proof of Stake',         subtitle: 'Validatori, staking e The Merge',     Icon: ShieldCheckIcon },
]

export default function LearnBlockchain() {
  const [activeChapter, setActiveChapter] = useState('bitcoin')
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
        title="Blockchain & Consenso — Bitcoin, Ethereum, PoW, PoS"
        description="Guida interattiva con grafici: come funziona la blockchain Bitcoin, il Proof of Work, la blockchain Ethereum, gli smart contract, il gas EIP-1559 e il Proof of Stake."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Guida alla Blockchain: Bitcoin, Ethereum, PoW e PoS',
          description: 'Come funzionano le blockchain Bitcoin ed Ethereum, il mining Proof of Work e il Proof of Stake',
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
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
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
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <LinkIcon size={20} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Dalla teoria alla pratica</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                In questa guida esploriamo come funzionano le blockchain <strong className="text-slate-800 dark:text-slate-100">Bitcoin</strong> ed{' '}
                <strong className="text-slate-800 dark:text-slate-100">Ethereum</strong> partendo dalle basi: blocchi, hash e immutabilità.
                Poi confrontiamo i due meccanismi di consenso: <strong className="text-slate-800 dark:text-slate-100">Proof of Work</strong> e{' '}
                <strong className="text-slate-800 dark:text-slate-100">Proof of Stake</strong>. I grafici sono interattivi: sperimenta!
              </p>
            </div>
          </div>

          {/* ── Chapter 07: La Blockchain Bitcoin ── */}
          <section
            id="bitcoin" data-chapter="bitcoin"
            ref={(el: HTMLElement | null) => { sectionRefs.current['bitcoin'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[0]} />
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Una <strong className="text-slate-800 dark:text-slate-100">blockchain</strong> è un registro digitale distribuito —
              una catena di blocchi collegati tra loro in modo crittografico. Ogni blocco contiene un gruppo di transazioni
              e un riferimento al blocco precedente tramite il suo <em>hash</em>.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              L'<span className="text-amber-600 dark:text-amber-400 font-medium">hash</span> è un'impronta digitale unica:
              una funzione che prende qualsiasi input e produce una stringa di lunghezza fissa (256 bit per SHA-256 di Bitcoin).
              Se cambi anche un solo carattere dell'input, l'hash cambia completamente.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ogni blocco contiene: il <span className="font-mono text-sm text-slate-800 dark:text-slate-200">prevHash</span> (hash del blocco precedente),
              un <span className="font-mono text-sm text-slate-800 dark:text-slate-200">merkle root</span> (riassunto di tutte le transazioni),
              un <span className="font-mono text-sm text-slate-800 dark:text-slate-200">nonce</span> (numero usato per il mining),
              il <span className="font-mono text-sm text-slate-800 dark:text-slate-200">timestamp</span> e le transazioni stesse.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Questo collegamento a catena rende la blockchain <strong className="text-slate-800 dark:text-slate-100">immutabile</strong>:
              modificare una transazione in un blocco passato cambierebbe il suo hash, invalidando tutti i blocchi successivi.
              Prova tu stesso nel grafico qui sotto!
            </p>
            <div className="card p-4">
              <BlockStructureChart />
            </div>
            <div className="mt-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-200">Come leggere il grafico:</strong> ogni rettangolo è un blocco con le sue transazioni.
              Clicca su una transazione per modificarla: vedrai l'hash del blocco cambiare e tutti i blocchi successivi diventare rossi (invalidi).
              Questo dimostra perché è praticamente impossibile falsificare la blockchain.
            </div>
            <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-blue-700 dark:text-blue-400">Punto chiave:</strong> Bitcoin usa il modello{' '}
              <strong className="text-slate-800 dark:text-slate-100">UTXO</strong> (Unspent Transaction Output):
              ogni transazione consuma output di transazioni precedenti e ne crea di nuovi. Non ci sono "conti" con un saldo —
              il tuo saldo è la somma di tutti gli UTXO che puoi spendere con la tua chiave privata.
            </div>
          </section>

          {/* ── Chapter 08: Proof of Work ── */}
          <section
            id="pow" data-chapter="pow"
            ref={(el: HTMLElement | null) => { sectionRefs.current['pow'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[1]} />

            {/* Il problema */}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Abbiamo visto che una blockchain è una catena di blocchi. Ma chi ha il <em>diritto</em> di aggiungere il prossimo blocco?
              Se chiunque potesse farlo, un attaccante potrebbe creare blocchi con transazioni false.
              Serve un sistema per rendere la creazione di un blocco <strong className="text-slate-800 dark:text-slate-100">costosa</strong> —
              così un attaccante non può competere con l'intera rete.
            </p>

            {/* L'analogia */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 my-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong className="text-amber-700 dark:text-amber-400">Immagina una gara:</strong>{' '}
                il protocollo dice a tutti i miner del mondo: <em>"vi do un lucchetto a combinazione con 4 cifre.
                Il primo che indovina il codice vince il diritto di aggiungere il blocco e incassa la ricompensa."</em>
                Non c'è trucco: l'unico modo è provare numeri a caso, uno dopo l'altro.
                Chi ha un computer più veloce prova più combinazioni al secondo e ha più probabilità di vincere.
              </p>
            </div>

            {/* Come funziona tecnicamente */}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              In termini tecnici, il "lucchetto" è la funzione hash SHA-256. Il miner prende i dati del blocco
              (transazioni, hash precedente, timestamp) e ci aggiunge un numero chiamato{' '}
              <span className="text-amber-600 dark:text-amber-400 font-medium">nonce</span>.
              Calcola l'hash dell'insieme e controlla: l'hash inizia con il numero richiesto di zeri?
              Se no, incrementa il nonce di uno e riprova. E così via, miliardi di volte.
            </p>

            {/* Le 3 regole */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm mb-2">1</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">La difficoltà</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quanti zeri deve avere l'hash all'inizio. Più zeri = meno hash validi = più tentativi necessari.
                  Si adatta ogni 2.016 blocchi per mantenere ~10 minuti per blocco.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-2">2</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">La ricompensa</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Il primo miner che trova l'hash valido riceve BTC appena creati (3.125 BTC, dimezzati ogni ~4 anni)
                  più le fee di tutte le transazioni nel blocco.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm mb-2">3</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">La sicurezza</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Per riscrivere un blocco passato, un attaccante dovrebbe rifarlo <em>e</em> tutti quelli dopo — più veloce
                  dell'intera rete. Oggi richiederebbe più elettricità di un paese intero.
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Prova il simulatore qui sotto: scegli la difficoltà e osserva il miner che prova migliaia di nonce fino a trovare
              quello giusto. Nota come a difficoltà maggiore servono esponenzialmente più tentativi.
            </p>

            <div className="card p-4">
              <MiningSimulatorChart />
            </div>

            {/* Il ciclo di vita del miner */}
            <div className="mt-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-sm space-y-3">
              <strong className="text-slate-700 dark:text-slate-200">Il lavoro quotidiano di un miner, passo per passo:</strong>
              <ol className="space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <span><strong className="text-slate-800 dark:text-slate-100">Raccoglie le transazioni</strong> in attesa dalla mempool (la "sala d'attesa" delle tx non confermate), privilegiando quelle con fee più alte.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <span><strong className="text-slate-800 dark:text-slate-100">Assembla il blocco candidato</strong>: inserisce le transazioni, l'hash del blocco precedente, il timestamp e un nonce iniziale.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <span><strong className="text-slate-800 dark:text-slate-100">Esegue il mining</strong>: prova nonce dopo nonce, calcolando SHA-256 miliardi di volte al secondo con hardware specializzato (ASIC).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                  <span><strong className="text-slate-800 dark:text-slate-100">Trova l'hash valido</strong> → trasmette il blocco a tutta la rete. Gli altri nodi verificano (istantaneo!) e aggiungono il blocco alla propria copia della catena.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">5</span>
                  <span><strong className="text-slate-800 dark:text-slate-100">Incassa la ricompensa</strong>: block reward + fee delle transazioni. Le transazioni nel blocco sono ora confermate.</span>
                </li>
              </ol>
            </div>

            {/* Halving + costo energetico */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm">
                <strong className="text-indigo-700 dark:text-indigo-400">L'halving:</strong>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Ogni ~210.000 blocchi (~4 anni) la ricompensa si dimezza: era 50 BTC nel 2009, oggi è 3.125.
                  Questo rende Bitcoin <strong className="text-slate-800 dark:text-slate-100">deflazionario</strong>:
                  il supply totale non supererà mai i 21 milioni di BTC.
                  L'ultimo halving: aprile 2024. Il prossimo: ~2028.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm">
                <strong className="text-red-700 dark:text-red-400">Il costo energetico:</strong>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  La rete Bitcoin consuma circa <strong className="text-slate-800 dark:text-slate-100">150 TWh/anno</strong> — quanto l'Argentina.
                  Ogni transazione: ~700 kWh (~50 giorni di elettricità domestica).
                  Questa è la critica principale al PoW e la ragione per cui Ethereum è passata al Proof of Stake.
                </p>
              </div>
            </div>
          </section>

          {/* ── Chapter 09: La Blockchain Ethereum ── */}
          <section
            id="ethereum" data-chapter="ethereum"
            ref={(el: HTMLElement | null) => { sectionRefs.current['ethereum'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[2]} />
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ethereum è nato nel 2015 con un'idea rivoluzionaria: non solo registrare transazioni di valore,
              ma eseguire <strong className="text-slate-800 dark:text-slate-100">programmi</strong> sulla blockchain.
              Questi programmi sono gli <span className="text-blue-600 dark:text-blue-400 font-medium">smart contract</span>:
              codice che vive sulla blockchain e si esegue automaticamente quando riceve una transazione.
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
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 text-sm space-y-1 mb-2 ml-2">
              <li><strong className="text-slate-800 dark:text-slate-100">Base fee</strong> — calcolata automaticamente dal protocollo. Sale se i blocchi sono pieni (&gt;50%), scende se sono vuoti.</li>
              <li><strong className="text-slate-800 dark:text-slate-100">Priority fee</strong> (mancia) — pagata volontariamente per avere priorità nell'inclusione.</li>
              <li><strong className="text-slate-800 dark:text-slate-100">Fee totale</strong> = base fee + priority fee. La base fee viene <span className="text-red-600 dark:text-red-400 font-medium">bruciata</span> (distrutta), rendendo ETH potenzialmente deflazionario.</li>
            </ul>
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
            <ChapterHeader ch={chapters[3]} />
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Il <strong className="text-slate-800 dark:text-slate-100">Proof of Stake</strong> (PoS) è un meccanismo di consenso
              alternativo al PoW. Invece di consumare energia per trovare un hash, i partecipanti bloccano ("stakano")
              ETH come garanzia. In Ethereum servono almeno{' '}
              <strong className="text-slate-800 dark:text-slate-100">32 ETH</strong> per diventare un validatore.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ogni 12 secondi (uno <em>slot</em>), il protocollo seleziona casualmente un validatore come{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">block proposer</span>: chi propone il blocco.
              La probabilità di essere scelti è proporzionale allo stake. Gli altri validatori{' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium">attestano</span> (votano) la validità del blocco.
              Dopo 2 epoche (64 slot, ~12.8 minuti), il blocco raggiunge la <em>finalità</em>: non può più essere modificato.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              La sicurezza è garantita dallo <span className="text-red-600 dark:text-red-400 font-medium">slashing</span>:
              se un validatore si comporta in modo disonesto (firma due blocchi diversi per lo stesso slot, o attesta
              dati contraddittori), il protocollo gli confisca parte dello stake. Un attaccante dovrebbe controllare
              oltre il 33% di tutto l'ETH in staking — attualmente oltre <strong className="text-slate-800 dark:text-slate-100">$30 miliardi</strong>.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Ethereum è passata da PoW a PoS il 15 settembre 2022 con <strong className="text-slate-800 dark:text-slate-100">"The Merge"</strong>,
              eliminando il mining e riducendo il consumo energetico del 99.95%.
              Usa il confronto e il simulatore per esplorare le differenze.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-center shrink-0">
        <ch.Icon size={22} weight="duotone" className="text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <div className="text-xs font-mono text-amber-500 dark:text-amber-400 mb-0.5">{ch.number}</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{ch.title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{ch.subtitle}</p>
      </div>
    </div>
  )
}
