import { useState } from 'react'

type View = 'home' | 'dashboard' | 'discover' | 'learn' | 'wallet'

interface NavBarProps {
  view: View
  onNavigate: (v: View) => void
  leftContent?: React.ReactNode
}

const navItems: { view: View; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'Dashboard',    icon: '📊' },
  { view: 'wallet',    label: 'My Positions', icon: '👛' },
  { view: 'discover',  label: 'Discover',     icon: '🔍' },
  { view: 'learn',     label: 'Learn',        icon: '🎓' },
]

export default function NavBar({ view, onNavigate, leftContent }: NavBarProps) {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {leftContent ?? (
            <button
              onClick={() => { onNavigate('home'); close() }}
              className="font-semibold text-slate-900 text-sm hover:text-indigo-600 transition-colors truncate"
            >
              Uniswap Analyzer
            </button>
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === item.view
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => { onNavigate(item.view); close() }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.view
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
