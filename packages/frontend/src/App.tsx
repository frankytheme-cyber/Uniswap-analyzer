import { useState, useEffect, useCallback } from 'react'
import Dashboard    from './pages/Dashboard.tsx'
import PoolDetail   from './pages/PoolDetail.tsx'
import Discover     from './pages/Discover.tsx'
import Home         from './pages/Home.tsx'
import Learn        from './pages/Learn.tsx'
import MyPositions  from './pages/MyPositions.tsx'
import NavBar       from './components/NavBar.tsx'
import PasswordGate from './components/PasswordGate.tsx'

type View = 'home' | 'dashboard' | 'discover' | 'learn' | 'wallet'

function DisclaimerBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem('disclaimer-dismissed') !== '1')

  const dismiss = useCallback(() => {
    localStorage.setItem('disclaimer-dismissed', '1')
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-3 text-xs text-amber-900">
      <span className="shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" aria-hidden>⚠</span>
      <p className="flex-1 leading-relaxed">
        <strong>Solo a scopo informativo.</strong>{' '}
        Uniswap Pool Analyzer è uno strumento di analisi dati e non costituisce consulenza finanziaria,
        di investimento o legale. I dati mostrati provengono da fonti terze e potrebbero contenere
        imprecisioni. Qualsiasi decisione di investimento è di esclusiva responsabilità dell'utente.
      </p>
      <button
        onClick={dismiss}
        aria-label="Chiudi avviso"
        className="shrink-0 text-amber-500 hover:text-amber-200 dark:text-amber-500 dark:hover:text-amber-300 transition-colors ml-1 leading-none text-base"
      >
        ✕
      </button>
    </div>
  )
}

function useFontScale() {
  const [large, setLarge] = useState(() => localStorage.getItem('font-lg') === '1')

  useEffect(() => {
    document.documentElement.classList.toggle('font-lg', large)
    localStorage.setItem('font-lg', large ? '1' : '0')
  }, [large])

  return { large, toggle: () => setLarge((v) => !v) }
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('dark-mode')
    if (saved !== null) return saved === '1'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark-mode', dark ? '1' : '0')
  }, [dark])

  return { dark, toggle: () => setDark((v) => !v) }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [selected, setSelected] = useState<{ chain: string; address: string } | null>(null)
  const font = useFontScale()
  const theme = useDarkMode()

  const controls = (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1.5 shadow-md">
      <button
        onClick={font.toggle}
        title={font.large ? 'Riduci testo' : 'Ingrandisci testo'}
        className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
          font.large
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        A<span className="text-[9px] leading-none">+</span>
      </button>
      <div className="w-px h-3.5 bg-slate-200" />
      <button
        onClick={theme.toggle}
        title={theme.dark ? 'Modalità chiara' : 'Modalità scura'}
        className="px-2 py-0.5 rounded-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        {theme.dark ? '☀' : '☾'}
      </button>
    </div>
  )

  if (selected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DisclaimerBanner />
        <PoolDetail
          chain={selected.chain}
          address={selected.address}
          onBack={() => setSelected(null)}
        />
        {controls}
      </div>
    )
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-slate-50">
        <DisclaimerBanner />
        <Home onNavigate={setView} />
        {controls}
      </div>
    )
  }

  if (view === 'learn') {
    return (
      <div className="min-h-screen bg-slate-50">
        <DisclaimerBanner />
        <Learn onBack={() => setView('home')} onNavigate={setView} />
        {controls}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DisclaimerBanner />
      <NavBar
        view={view}
        onNavigate={setView}
        leftContent={
          <button
            onClick={() => setView('home')}
            className="font-semibold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
          >
            Uniswap Analyzer
          </button>
        }
      />

      {view === 'dashboard' && (
        <Dashboard onSelectPool={(chain, address) => setSelected({ chain, address })} />
      )}
      {view === 'wallet' && (
        <MyPositions onSelectPool={(chain, address) => setSelected({ chain, address })} />
      )}
      {view === 'discover' && (
        <PasswordGate>
          <Discover
            onSelectPool={(chain, address) => setSelected({ chain, address })}
            onBack={() => setView('dashboard')}
          />
        </PasswordGate>
      )}

      {controls}
    </div>
  )
}
