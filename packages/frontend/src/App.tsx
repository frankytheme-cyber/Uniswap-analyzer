import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { Warning as WarningIcon, X as XIcon, Sun as SunIcon, Moon as MoonIcon } from '@phosphor-icons/react'
import Dashboard    from './pages/Dashboard.tsx'
import PoolDetail   from './pages/PoolDetail.tsx'
import Discover     from './pages/Discover.tsx'
import Home         from './pages/Home.tsx'
import LearnIndex   from './pages/LearnIndex.tsx'
import LearnDex     from './pages/LearnDex.tsx'
import LearnLending from './pages/LearnLending.tsx'
import LearnBlockchain from './pages/LearnBlockchain.tsx'
import LearnEthereum from './pages/LearnEthereum.tsx'
import MyPositions  from './pages/MyPositions.tsx'
import NavBar       from './components/NavBar.tsx'
import PasswordGate from './components/PasswordGate.tsx'

function DisclaimerBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem('disclaimer-dismissed') !== '1')

  const dismiss = useCallback(() => {
    localStorage.setItem('disclaimer-dismissed', '1')
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="w-full px-4 py-2.5 flex items-start gap-3 text-xs border-b"
      style={{
        backgroundColor: 'var(--warn-bg)',
        borderColor: 'var(--warn-border)',
        color: 'var(--warn-text)',
      }}
    >
      <WarningIcon size={14} weight="bold" className="shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 leading-relaxed">
        <strong>Solo a scopo informativo.</strong>{' '}
        Uniswap Pool Analyzer è uno strumento di analisi dati e non costituisce consulenza finanziaria,
        di investimento o legale. I dati mostrati provengono da fonti terze e potrebbero contenere
        imprecisioni. Qualsiasi decisione di investimento è di esclusiva responsabilità dell'utente.
      </p>
      <button
        onClick={dismiss}
        aria-label="Chiudi avviso"
        className="shrink-0 transition-colors ml-1 opacity-70 hover:opacity-100"
      >
        <XIcon size={14} weight="bold" />
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
    // Default dark — matches the homepage aesthetic
    return true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark-mode', dark ? '1' : '0')
  }, [dark])

  return { dark, toggle: () => setDark((v) => !v) }
}

export default function App() {
  const font = useFontScale()
  const theme = useDarkMode()

  const controls = (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full px-2 py-1.5 shadow-md border"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        onClick={font.toggle}
        title={font.large ? 'Riduci testo' : 'Ingrandisci testo'}
        className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: font.large ? 'var(--accent-soft)' : 'transparent',
          color: font.large ? 'var(--accent)' : 'var(--text-faint)',
        }}
      >
        A<span className="text-[9px] leading-none">+</span>
      </button>
      <div className="w-px h-3.5" style={{ backgroundColor: 'var(--border)' }} />
      <button
        onClick={theme.toggle}
        title={theme.dark ? 'Modalità chiara' : 'Modalità scura'}
        className="px-2 py-0.5 rounded-full text-xs transition-colors"
        style={{ color: 'var(--text-faint)' }}
      >
        {theme.dark ? <SunIcon size={14} weight="bold" /> : <MoonIcon size={14} weight="bold" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen">
      <DisclaimerBanner />

      <Routes>
        <Route path="/" element={<Home />} />
        {/* Pages with shared NavBar */}
        <Route element={<><NavBar /><Outlet /></>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pool/:chain/:address" element={<PoolDetail />} />
          <Route path="/wallet" element={<MyPositions />} />
          <Route path="/discover" element={<PasswordGate><Discover /></PasswordGate>} />
          <Route path="/learn" element={<LearnIndex />} />
          <Route path="/learn/dex" element={<LearnDex />} />
          <Route path="/learn/lending" element={<LearnLending />} />
          <Route path="/learn/blockchain" element={<LearnBlockchain />} />
          <Route path="/learn/ethereum" element={<LearnEthereum />} />
        </Route>
      </Routes>

      {controls}
      <Analytics />
    </div>
  )
}
