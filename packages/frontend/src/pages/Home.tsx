import type { FC } from 'react'
import NavBar from '../components/NavBar.tsx'

type View = 'home' | 'dashboard' | 'discover' | 'learn'

interface HomeProps {
  onNavigate: (view: View) => void
}

interface SectionCard {
  view: View
  icon: string
  title: string
  description: string
  features: string[]
  accentText: string
  accentBorder: string
  accentIconBg: string
  accentDot: string
}

const cards: SectionCard[] = [
  {
    view: 'dashboard',
    icon: '📊',
    title: 'Il Tuo Portafoglio',
    description: 'Aggiungi pool alla watchlist e monitora la salute delle tue posizioni in tempo reale.',
    features: ['Analisi 6 parametri', 'Score di salute', 'Grafici avanzati', 'Simulatore IL'],
    accentText:    'text-indigo-600',
    accentBorder:  'hover:border-indigo-300 hover:shadow-indigo-100',
    accentIconBg:  'bg-indigo-50',
    accentDot:     'bg-indigo-400',
  },
  {
    view: 'discover',
    icon: '🔍',
    title: 'Scopri Pool',
    description: 'Esplora le top pool per chain, ordinate per score, liquidità e volume organico.',
    features: ['Top pool per chain', 'Ranking automatico', 'V3 + V4 support', 'Aggiunta rapida'],
    accentText:    'text-emerald-600',
    accentBorder:  'hover:border-emerald-300 hover:shadow-emerald-100',
    accentIconBg:  'bg-emerald-50',
    accentDot:     'bg-emerald-400',
  },
  {
    view: 'learn',
    icon: '🎓',
    title: 'Come Funziona una Pool',
    description: 'Guida interattiva con grafici: AMM, liquidità concentrata V3, impermanent loss e strategie.',
    features: ['Curva AMM x·y=k', 'Liquidità V3 concentrata', 'Price impact visivo', 'Ribilanciamento'],
    accentText:    'text-violet-600',
    accentBorder:  'hover:border-violet-300 hover:shadow-violet-100',
    accentIconBg:  'bg-violet-50',
    accentDot:     'bg-violet-400',
  },
]

const Home: FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar view="home" onNavigate={onNavigate} />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-600 text-xs font-medium mb-6">
          Uniswap V3 · Multi-chain · Real-time
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          Uniswap Pool Analyzer
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
          Analizza la salute delle pool di liquidità, scopri le migliori opportunità
          e impara come funzionano gli AMM.
        </p>
      </div>

      {/* Cards grid */}
      <div className="max-w-5xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
        {cards.map((card) => (
          <button
            key={card.view}
            onClick={() => onNavigate(card.view)}
            className={`group text-left bg-white border border-slate-200 rounded-lg p-6 transition-all duration-200 shadow-card ${card.accentBorder} hover:shadow-card-hover hover:-translate-y-0.5`}
          >
            <div className={`w-11 h-11 ${card.accentIconBg} rounded-lg flex items-center justify-center text-xl mb-5`}>
              {card.icon}
            </div>

            <h2 className="text-base font-semibold text-slate-900 mb-2">{card.title}</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">{card.description}</p>

            <ul className="space-y-1.5 mb-6">
              {card.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${card.accentDot} shrink-0`} />
                  {f}
                </li>
              ))}
            </ul>

            <div className={`flex items-center gap-1 text-sm font-medium ${card.accentText} group-hover:gap-2 transition-all`}>
              Vai alla sezione
              <span>→</span>
            </div>
          </button>
        ))}
      </div>

      {/* SEO content block */}
      <div className="max-w-5xl mx-auto px-4 pb-16 w-full">
        <div className="border-t border-slate-200 pt-12 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm text-slate-500 leading-relaxed">
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Cos'è Uniswap Pool Analyzer?</h2>
            <p className="mb-3">
              Uniswap Pool Analyzer è uno strumento open-source per analizzare le pool di liquidità di Uniswap V3 e V4
              su Ethereum, Arbitrum, Base e Polygon. Calcola automaticamente sei parametri chiave — TVL reale, volume
              organico, fee APR, efficienza del capitale, competitività e presenza di incentivi artificiali —
              restituendo un <strong className="text-slate-600">score di salute</strong> per ogni pool.
            </p>
            <p>
              I dati vengono aggiornati ogni 15 minuti tramite The Graph, GeckoTerminal e DeFiLlama,
              con una cache locale che riduce le chiamate API e garantisce risposte rapide.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Come analizzare una pool Uniswap V3</h2>
            <p className="mb-3">
              Per valutare se una pool è conveniente per un LP occorre guardare oltre il semplice APY.
              L'<strong className="text-slate-600">impermanent loss</strong> in V3 con range concentrato può erodere
              i guadagni da fee se il prezzo esce dal range scelto.
              Il simulatore integrato calcola il break-even esatto tra fee guadagnate e IL subito.
            </p>
            <p>
              La sezione <em className="text-slate-600">Scopri Pool</em> analizza automaticamente le top pool per chain,
              mentre la <em className="text-slate-600">guida interattiva</em> spiega la curva AMM x·y=k,
              la liquidità concentrata V3 e le strategie di ribilanciamento con grafici live.
            </p>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Metriche calcolate</h2>
            <ul className="space-y-1.5">
              {[
                ['TVL Reale vs Gonfiato', 'rapporto tra liquidità attiva (AVL) e TVL totale'],
                ['Volume Organico', 'indice di Herfindahl-Hirschman per rilevare wash trading'],
                ['Fee APR', 'rendimento annualizzato delle fee su 365 giorni di dati storici'],
                ['Efficienza Capitale V3', '% del tempo che il prezzo rimane nel range scelto'],
                ['Fee Competitiva', 'confronto con pool simili sullo stesso fee tier e chain'],
                ['Incentivi Artificiali', 'correlazione TVL-fee per rilevare liquidità gonfiata'],
              ].map(([name, desc]) => (
                <li key={name} className="flex gap-2">
                  <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
                  <span><span className="text-slate-600">{name}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-slate-700 font-semibold mb-3 text-base">Chain supportate</h2>
            <p className="mb-3">
              Il tool supporta le quattro chain principali dove Uniswap V3 è deployato con la maggiore liquidità:
            </p>
            <ul className="space-y-1.5">
              {[
                ['Ethereum', 'chain principale, pool con la TVL più alta'],
                ['Arbitrum', 'L2 Optimistic Rollup, fee di gas molto basse'],
                ['Base', 'L2 di Coinbase, in forte crescita dal 2024'],
                ['Polygon', 'sidechain EVM, ampia adozione retail'],
              ].map(([chain, desc]) => (
                <li key={chain} className="flex gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">·</span>
                  <span><span className="text-slate-600">{chain}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-200 py-4 text-center text-xs text-slate-400 space-y-2">
        <div>
          Dati: The Graph · GeckoTerminal · DeFiLlama &nbsp;·&nbsp; Ethereum · Arbitrum · Base · Polygon
        </div>
        <div>
          Created by <a href="https://simonepuliti.dev" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 transition-colors">Simone Puliti</a>
        </div>
      </div>
    </div>
  )
}

export default Home
