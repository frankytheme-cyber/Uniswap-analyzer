import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  ChartBarIcon,
  WalletIcon,
  GraduationCapIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ChartLineUpIcon,
  BracketsSquareIcon,
  LightningIcon,
} from '@phosphor-icons/react'
import SEO from '../components/SEO.tsx'
import NavBar from '../components/NavBar.tsx'

/* ─── Data ────────────────────────────────────────────────────────────────── */

const metrics = [
  { label: 'TVL Reale vs Gonfiato', desc: 'Rapporto AVL/TVL — rileva liquidità inattiva' },
  { label: 'Volume Organico', desc: 'Indice Herfindahl-Hirschman contro wash trading' },
  { label: 'Fee APR', desc: 'Rendimento annualizzato su 365gg di dati storici' },
  { label: 'Efficienza Capitale', desc: '% del tempo che il prezzo resta nel range scelto' },
  { label: 'Fee Competitiva', desc: 'Confronto con pool simili sullo stesso fee tier' },
  { label: 'Incentivi Artificiali', desc: 'Correlazione TVL-fee per rilevare liquidità gonfiata' },
]

const chains = [
  { name: 'Ethereum', colorVar: '--chain-eth',  dotClass: 'bg-blue-400'   },
  { name: 'Arbitrum', colorVar: '--chain-arb',  dotClass: 'bg-sky-400'    },
  { name: 'Base',     colorVar: '--chain-base', dotClass: 'bg-blue-300'   },
  { name: 'Polygon',  colorVar: '--chain-pol',  dotClass: 'bg-violet-400' },
]

interface Section {
  path: string
  tag: string
  title: string
  description: string
  detail: string
  Icon: React.ElementType
  accentVar: string       // CSS variable name for the accent color
  badgeBg: string         // inline bg color for badge
  badgeBorder: string     // inline border color for badge
  badgeText: string       // inline text color for badge
  borderHoverClass: string
  features: string[]
}

const sections: Section[] = [
  {
    path: '/dashboard',
    tag: 'WATCHLIST',
    title: 'Pool Analyzer',
    description: 'Monitora la salute delle pool Uniswap V3 con sei parametri quantitativi. Score di salute aggregato, simulatore IL, backtesting e strategy advisor.',
    detail: "Aggiungi qualsiasi pool dalla watchlist e ottieni un'analisi completa: TVL reale, volume organico, fee APR, efficienza del capitale e rischio di incentivi artificiali.",
    Icon: ChartBarIcon,
    accentVar: '--home-blue',
    badgeBg: 'var(--home-badge-blue-bg)',
    badgeBorder: 'var(--home-badge-blue-border)',
    badgeText: 'var(--home-badge-blue-text)',
    borderHoverClass: 'home-card-hover-blue',
    features: ['Score salute 0–100', 'Simulatore IL V3', 'Backtesting 4 strategie', 'Strategy Advisor EMA'],
  },
  {
    path: '/wallet',
    tag: 'POSIZIONI',
    title: 'My Positions',
    description: 'Collega il tuo wallet e visualizza le posizioni attive su Uniswap V3 e V4 con P&L in tempo reale, fee accumulate e impermanent loss per posizione.',
    detail: 'Analisi live di ogni NFT di liquidità: range attivo/inattivo, fee guadagnate vs IL, storico dei movimenti e confronto con strategia HODL.',
    Icon: WalletIcon,
    accentVar: '--home-green',
    badgeBg: 'var(--home-badge-green-bg)',
    badgeBorder: 'var(--home-badge-green-border)',
    badgeText: 'var(--home-badge-green-text)',
    borderHoverClass: 'home-card-hover-green',
    features: ['Posizioni aperte V3 + V4', 'Fee accumulate live', 'IL per posizione', 'Storico movimenti'],
  },
  {
    path: '/discover',
    tag: 'DISCOVER · BETA',
    title: 'Scopri Pool',
    description: 'Analisi automatica delle top pool per chain: identifica le migliori opportunità LP ordinate per score di salute, fee APR e efficienza del capitale.',
    detail: 'Filtra per chain, fee tier e token. Ogni pool mostra lo score aggregato e i parametri chiave per permettere confronti rapidi tra opportunità.',
    Icon: MagnifyingGlassIcon,
    accentVar: '--home-amber',
    badgeBg: 'var(--home-badge-amber-bg)',
    badgeBorder: 'var(--home-badge-amber-border)',
    badgeText: 'var(--home-badge-amber-text)',
    borderHoverClass: 'home-card-hover-amber',
    features: ['Top pool per chain', 'Filtri fee tier', 'Score comparativo', 'Export watchlist'],
  },
  {
    path: '/learn',
    tag: 'EDUCAZIONE',
    title: 'Learn DeFi',
    description: 'Guide interattive con grafici live su AMM, liquidità concentrata V3, impermanent loss, lending protocol e blockchain. Dalle basi alla pratica avanzata.',
    detail: 'Tre percorsi: Pool di Liquidità (capitoli 01–05), Prestiti & Collaterale (capitolo 06), Blockchain & Consenso (capitoli 07–10). Ogni capitolo ha simulatori interattivi.',
    Icon: GraduationCapIcon,
    accentVar: '--home-violet',
    badgeBg: 'var(--home-badge-violet-bg)',
    badgeBorder: 'var(--home-badge-violet-border)',
    badgeText: 'var(--home-badge-violet-text)',
    borderHoverClass: 'home-card-hover-violet',
    features: ['Curva AMM x·y=k', 'Liquidità concentrata V3', 'Aave Health Factor', 'PoW · PoS · Gas EIP-1559'],
  },
]

/* ─── Component ───────────────────────────────────────────────────────────── */

const Home: FC = () => {
  return (
    <div className="home-page min-h-screen flex flex-col">
      <SEO
        title="Analisi Pool Liquidità Uniswap V3/V4"
        description="Analizza la salute delle pool di liquidità Uniswap V3 e V4 su Ethereum, Arbitrum, Base e Polygon. Score di salute, simulatore impermanent loss, fee APR, efficienza del capitale e strategie LP."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Uniswap Pool Analyzer',
          description: 'Strumento di analisi per pool di liquidità Uniswap V3 e V4 multi-chain',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          author: { '@type': 'Person', name: 'Simone Puliti', url: 'https://simonepuliti.dev' },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      <NavBar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="home-hero relative overflow-hidden">
        {/* Background grid */}
        <div className="home-grid pointer-events-none absolute inset-0" />
        {/* Glow */}
        <div className="home-glow pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          {/* Badge */}
          <div className="home-badge inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase">
            <span className="home-badge-dot w-1.5 h-1.5 rounded-full animate-pulse" />
            Uniswap V3 &amp; V4 · Multi-chain · Open Source
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6 max-w-3xl">
            <span className="home-text-primary">Analizza</span>{' '}
            <span className="home-gradient-text">ogni pool</span>
            <br />
            <span className="home-text-primary">con dati reali.</span>
          </h1>

          <p className="home-text-muted text-lg max-w-xl leading-relaxed mb-10">
            Score di salute quantitativo su sei parametri, simulatore impermanent loss,
            backtesting e strategy advisor. Dati da The Graph, GeckoTerminal e DeFiLlama,
            aggiornati ogni 15 minuti.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-16">
            <Link
              to="/dashboard"
              className="home-cta-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Apri Dashboard
              <ArrowRightIcon size={14} weight="bold" />
            </Link>
            <Link
              to="/learn"
              className="home-cta-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            >
              Guida DeFi
            </Link>
          </div>

          {/* Chain pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="home-label text-xs font-mono mr-1">CHAIN SUPPORTATE</span>
            {chains.map((c) => (
              <span key={c.name} className="home-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dotClass}`} />
                <span>{c.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="home-stats-bar border-y">
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheckIcon, value: '6 parametri', label: 'Score di salute' },
            { icon: ChartLineUpIcon, value: '365 giorni',  label: 'Dati storici fee APR' },
            { icon: LightningIcon,   value: '15 minuti',   label: 'Intervallo aggiornamento' },
            { icon: BracketsSquareIcon, value: '4 chain',  label: 'Ethereum · ARB · Base · MATIC' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="home-stat-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <Icon size={16} weight="duotone" className="home-accent-icon" />
              </div>
              <div>
                <div className="home-text-primary text-sm font-bold">{value}</div>
                <div className="home-label text-xs font-mono">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections grid ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="mb-12">
          <span className="home-label text-xs font-mono tracking-widest uppercase">Sezioni</span>
          <h2 className="mt-2 text-2xl font-bold home-text-primary">Cosa puoi fare con questo tool</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((sec) => (
            <Link
              key={sec.path}
              to={sec.path}
              className={`home-section-card group relative block rounded-xl p-6 transition-all duration-300 ${sec.borderHoverClass}`}
            >
              {/* Tag */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono tracking-widest"
                  style={{ backgroundColor: sec.badgeBg, borderColor: sec.badgeBorder, color: sec.badgeText }}
                >
                  {sec.tag}
                </span>
                <ArrowRightIcon
                  size={14}
                  weight="bold"
                  className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
                  style={{ color: `var(${sec.accentVar})` }}
                />
              </div>

              {/* Icon + Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="home-icon-box w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <sec.Icon size={20} weight="duotone" style={{ color: `var(${sec.accentVar})` }} />
                </div>
                <h3 className="home-text-primary text-xl font-bold leading-tight">{sec.title}</h3>
              </div>

              <p className="home-text-secondary text-sm leading-relaxed mb-3">{sec.description}</p>
              <p className="home-text-faint text-xs leading-relaxed mb-5">{sec.detail}</p>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-1.5">
                {sec.features.map((f) => (
                  <span key={f} className="home-feature-chip px-2 py-0.5 rounded-full text-[11px] font-mono">
                    {f}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Metrics grid ──────────────────────────────────────────────────── */}
      <section className="home-metrics-section border-t">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-10">
            <span className="home-label text-xs font-mono tracking-widest uppercase">Metodologia</span>
            <h2 className="mt-2 text-2xl font-bold home-text-primary">Sei parametri quantitativi</h2>
            <p className="mt-2 text-sm home-text-muted max-w-xl">
              Ogni pool viene valutata su sei dimensioni indipendenti. Il risultato è uno score da 0 a 100
              con soglie di allerta calibrate su dati reali Uniswap V3.
            </p>
          </div>

          <div className="home-metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-xl overflow-hidden border">
            {metrics.map((m, i) => (
              <div key={m.label} className="home-metric-cell p-5 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="home-metric-index text-[10px] font-mono mt-0.5 shrink-0 w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="home-text-primary text-sm font-semibold mb-1">{m.label}</div>
                    <div className="home-text-muted text-xs leading-relaxed">{m.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO / About ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="home-text-primary text-base font-semibold mb-3">Cos'è Uniswap Pool Analyzer?</h2>
            <p className="home-text-muted text-sm leading-relaxed mb-3">
              Uniswap Pool Analyzer è uno strumento open-source per analizzare le pool di liquidità
              su Ethereum, Arbitrum, Base e Polygon. Calcola automaticamente sei parametri chiave
              e restituisce uno <span className="home-text-secondary">score di salute</span> per ogni pool.
            </p>
            <p className="home-text-muted text-sm leading-relaxed">
              I dati vengono aggiornati ogni 15 minuti tramite The Graph, GeckoTerminal e DeFiLlama,
              con cache locale che riduce le chiamate API e garantisce risposte rapide.
            </p>
          </div>
          <div>
            <h2 className="home-text-primary text-base font-semibold mb-3">Come analizzare una pool Uniswap V3</h2>
            <p className="home-text-muted text-sm leading-relaxed mb-3">
              Per valutare se una pool è conveniente per un LP occorre guardare oltre il semplice APY.
              L'<span className="home-text-secondary">impermanent loss</span> in V3 con range concentrato
              può erodere i guadagni da fee se il prezzo esce dal range scelto.
            </p>
            <p className="home-text-muted text-sm leading-relaxed">
              Il simulatore integrato calcola il break-even esatto tra fee guadagnate e IL subito,
              basato sulla formula del whitepaper Uniswap V3 con normalizzazione al prezzo di entrata.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="mt-auto home-footer border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs home-label">
          <div className="font-mono">Dati: The Graph · GeckoTerminal · DeFiLlama</div>
          <div>
            Created by{' '}
            <a
              href="https://simonepuliti.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-link transition-colors"
            >
              Simone Puliti
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
