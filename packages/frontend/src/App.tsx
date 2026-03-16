import { useState, useEffect } from 'react'
import Dashboard  from './pages/Dashboard.tsx'
import PoolDetail from './pages/PoolDetail.tsx'
import Discover   from './pages/Discover.tsx'
import Home       from './pages/Home.tsx'
import Learn      from './pages/Learn.tsx'
import NavBar     from './components/NavBar.tsx'

type View = 'home' | 'dashboard' | 'discover' | 'learn'

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
        <Home onNavigate={setView} />
        {controls}
      </div>
    )
  }

  if (view === 'learn') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Learn onBack={() => setView('home')} onNavigate={setView} />
        {controls}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
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

      {view === 'dashboard' ? (
        <Dashboard onSelectPool={(chain, address) => setSelected({ chain, address })} />
      ) : (
        <Discover
          onSelectPool={(chain, address) => setSelected({ chain, address })}
          onBack={() => setView('dashboard')}
        />
      )}

      {controls}
    </div>
  )
}
