import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CubeIcon, HammerIcon,
  ArrowRightIcon, ArrowLeftIcon, LinkIcon,
  WalletIcon, BroadcastIcon, CheckCircleIcon,
} from '@phosphor-icons/react'
import BlockStructureChart       from '../components/learn/BlockStructureChart.tsx'
import MiningSimulatorChart      from '../components/learn/MiningSimulatorChart.tsx'
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
        title="Bitcoin & Proof of Work — Blockchain, Hash, Mining"
        description="Guida interattiva con grafici: come funziona la blockchain Bitcoin, i blocchi, gli hash, l'immutabilità e il mining Proof of Work."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Guida alla Blockchain Bitcoin e al Proof of Work',
          description: 'Come funziona la blockchain Bitcoin, i blocchi, gli hash, l\'immutabilità e il mining Proof of Work',
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
                to="/learn/ethereum"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Ethereum & Proof of Stake <ArrowRightIcon size={10} weight="bold" />
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
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <LinkIcon size={20} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Le fondamenta della blockchain</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                In questa guida partiamo dalle basi: come funziona una transazione <strong className="text-slate-800 dark:text-slate-100">Bitcoin</strong>,
                come i blocchi vengono collegati tra loro con gli hash, e perché la blockchain è immutabile.
                Poi esploriamo il <strong className="text-slate-800 dark:text-slate-100">Proof of Work</strong>: il meccanismo
                che rende sicura la rete Bitcoin. I grafici sono interattivi: sperimenta!
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

            {/* Esempio concreto: una transazione Bitcoin */}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Partiamo da un esempio concreto per capire come funziona Bitcoin nella pratica.
            </p>

            {/* Alice e Simone — intro visuale */}
            <div className="my-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-5">
                {/* Alice */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="32" r="32" className="fill-violet-100 dark:fill-violet-900/50" />
                      <circle cx="32" cy="24" r="10" className="fill-violet-300 dark:fill-violet-600" />
                      <ellipse cx="32" cy="48" rx="18" ry="14" className="fill-violet-300 dark:fill-violet-600" />
                    </svg>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Alice</span>
                  <span className="text-xs text-slate-400 font-mono">3.5 BTC</span>
                </div>

                {/* Freccia con BTC */}
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-full px-4 py-1.5">
                    <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">1 BTC</span>
                  </div>
                  <svg width="80" height="20" viewBox="0 0 80 20" className="text-amber-400">
                    <line x1="0" y1="10" x2="65" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                    <polygon points="65,4 77,10 65,16" fill="currentColor" />
                  </svg>
                </div>

                {/* Simone */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="32" r="32" className="fill-sky-100 dark:fill-sky-900/50" />
                      <circle cx="32" cy="24" r="10" className="fill-sky-300 dark:fill-sky-600" />
                      <ellipse cx="32" cy="48" rx="18" ry="14" className="fill-sky-300 dark:fill-sky-600" />
                    </svg>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Simone</span>
                  <span className="text-xs text-slate-400 font-mono">0.2 BTC</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 text-center leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-100">Alice vuole inviare 1 BTC a Simone.</strong>{' '}
                Apre il wallet, inserisce l'indirizzo di Simone e conferma. Il wallet crea una{' '}
                <em>transazione</em> firmata digitalmente con la chiave privata di Alice:<br />
                <span className="inline-block mt-1.5 font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 text-amber-600 dark:text-amber-400">
                  "Trasferisci 1 BTC da Alice → Simone"
                </span>
              </p>
            </div>

            {/* Flusso visuale step-by-step */}
            <div className="my-5 bg-gradient-to-b from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5 sm:p-6">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-5">Il viaggio di 1 BTC: passo dopo passo</p>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
                {/* Step 1 — Firma */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 flex items-center justify-center shrink-0">
                    <WalletIcon size={22} weight="duotone" className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="sm:mt-1">
                    <div className="text-xs font-bold text-violet-600 dark:text-violet-400">1. Firma</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Alice firma la transazione con la sua chiave privata</p>
                  </div>
                  <ArrowRightIcon size={14} weight="bold" className="text-amber-300 hidden sm:block sm:rotate-0 mt-1" />
                </div>

                {/* Step 2 — Mempool */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                    <BroadcastIcon size={22} weight="duotone" className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="sm:mt-1">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">2. Mempool</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">La tx entra nella "sala d'attesa" della rete</p>
                  </div>
                  <ArrowRightIcon size={14} weight="bold" className="text-amber-300 hidden sm:block sm:rotate-0 mt-1" />
                </div>

                {/* Step 3 — Mining */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center shrink-0">
                    <HammerIcon size={22} weight="duotone" className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="sm:mt-1">
                    <div className="text-xs font-bold text-orange-600 dark:text-orange-400">3. Mining</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">La tx viene inclusa nel blocco da minare</p>
                  </div>
                  <ArrowRightIcon size={14} weight="bold" className="text-amber-300 hidden sm:block sm:rotate-0 mt-1" />
                </div>

                {/* Step 4 — Blocco */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                    <CubeIcon size={22} weight="duotone" className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="sm:mt-1">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">4. Blocco</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Il blocco viene validato e aggiunto alla catena</p>
                  </div>
                  <ArrowRightIcon size={14} weight="bold" className="text-amber-300 hidden sm:block sm:rotate-0 mt-1" />
                </div>

                {/* Step 5 — Confermato */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircleIcon size={22} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="sm:mt-1">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">5. Confermato</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Simone riceve 1 BTC — irreversibile!</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2">
                <span className="text-xs text-slate-400">~10 min per la prima conferma</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-xs text-slate-400">Dopo 6 conferme (~1 ora) la tx è irreversibile</span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Ma come fa la rete a garantire che Alice abbia davvero 1 BTC e non stia barando?
              E come impedisce che qualcuno modifichi la transazione dopo che è stata registrata? La risposta è la{' '}
              <strong className="text-slate-800 dark:text-slate-100">blockchain</strong>.
            </p>

            {/* Ora contestualizziamo la blockchain */}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              La transazione di Alice è ora registrata per sempre. Ma in che modo? Qui entra in gioco la struttura della{' '}
              <strong className="text-slate-800 dark:text-slate-100">blockchain</strong>: un registro digitale distribuito,
              una catena di blocchi collegati tra loro in modo crittografico.
            </p>

            {/* Cos'è un hash — scheda visuale */}
            <div className="my-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">#</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cos'è un hash?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Un'impronta digitale unica: una funzione che prende <em>qualsiasi</em> input e produce
                una stringa di lunghezza fissa (256 bit per SHA-256).
              </p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-slate-400 shrink-0 w-16">Input</span>
                  <span className="bg-slate-100 dark:bg-slate-700 rounded px-2.5 py-1.5 text-slate-700 dark:text-slate-200 break-all">"Ciao"</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-slate-400 shrink-0 w-16">Hash</span>
                  <span className="bg-emerald-50 dark:bg-emerald-900/30 rounded px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300 break-all">a1b2c3d4e5f6…</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-slate-400 shrink-0 w-16">Input</span>
                  <span className="bg-slate-100 dark:bg-slate-700 rounded px-2.5 py-1.5 text-slate-700 dark:text-slate-200 break-all">"Cia<span className="text-red-500 font-bold">o</span>" → "Cia<span className="text-red-500 font-bold">u</span>"</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-slate-400 shrink-0 w-16">Hash</span>
                  <span className="bg-red-50 dark:bg-red-900/30 rounded px-2.5 py-1.5 text-red-600 dark:text-red-400 break-all">f7e8d9c0b1a2… <span className="font-semibold">completamente diverso!</span></span>
                </div>
              </div>
            </div>

            {/* Struttura del blocco — griglia visuale */}
            <div className="my-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CubeIcon size={18} weight="duotone" className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Anatomia di un blocco</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                  <div className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">prevHash</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Hash del blocco precedente — il "collegamento" della catena</p>
                </div>
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3 text-center">
                  <div className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold mb-1">merkle root</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Riassunto crittografico di tutte le transazioni</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">nonce</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Numero che il miner cambia per trovare l'hash valido</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-center">
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold mb-1">timestamp</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Data e ora di creazione del blocco</p>
                </div>
              </div>
              <div className="mt-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
                <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">transazioni</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Alice → Simone: 1 BTC &nbsp;|&nbsp; Carol → Dave: 0.5 BTC &nbsp;|&nbsp; …</p>
              </div>
            </div>

            {/* Come si calcola l'hash del blocco */}
            <div className="my-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">f</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Come si calcola l'hash del blocco?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                L'hash viene calcolato applicando SHA-256 a <strong className="text-slate-800 dark:text-slate-100">tutti i campi dell'header</strong> concatenati insieme:
              </p>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 font-mono text-xs text-center">
                <span className="text-slate-500 dark:text-slate-400">hash = SHA-256(</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">prevHash</span>
                <span className="text-slate-400"> + </span>
                <span className="text-violet-600 dark:text-violet-400 font-bold">merkle root</span>
                <span className="text-slate-400"> + </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">nonce</span>
                <span className="text-slate-400"> + </span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">timestamp</span>
                <span className="text-slate-500 dark:text-slate-400">)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Se <em>qualsiasi</em> campo cambia — una transazione modificata altera il merkle root, che altera l'hash.
                E siccome il blocco successivo contiene il <span className="text-amber-600 dark:text-amber-400 font-mono">prevHash</span> nel suo header,
                anche il <em>suo</em> hash cambia. Effetto domino.
              </p>
            </div>

            {/* Immutabilità — step a cascata */}
            <div className="my-5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">Perché la blockchain è immutabile</h3>
              <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Eve (attaccante) modifica la tx nel blocco #102: <span className="font-mono text-xs">"1 BTC a Simone"</span> → <span className="font-mono text-xs text-red-600 dark:text-red-400">"1 BTC a Eve"</span></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Il <span className="font-mono text-xs text-violet-600 dark:text-violet-400">merkle root</span> cambia → l'hash del blocco #102 cambia completamente</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Il blocco #103 ha nel suo header il <span className="font-mono text-xs text-amber-600 dark:text-amber-400">prevHash</span> del <em>vecchio</em> #102 → <strong className="text-red-700 dark:text-red-400">non corrisponde più</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>Blocchi #104, #105, … tutti invalidi a cascata</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                  <span>L'intera rete rifiuta la catena modificata — <strong className="text-emerald-700 dark:text-emerald-400">Simone può fidarsi</strong></span>
                </div>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Prova tu stesso nel grafico qui sotto: clicca su una transazione per modificarla e guarda l'effetto a cascata.
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

          {/* CTA section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-10 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Continua a esplorare:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/learn/ethereum"
                className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 rounded-lg p-4 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowRightIcon size={16} weight="bold" className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Ethereum & PoS</div>
                  <div className="text-xs text-slate-400">Smart contract, gas, Proof of Stake</div>
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
