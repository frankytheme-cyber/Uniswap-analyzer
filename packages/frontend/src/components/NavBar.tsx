import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ChartBarIcon,
  WalletIcon,
  MagnifyingGlassIcon,
  GraduationCapIcon,
  ListIcon,
  XIcon,
  ChartPieSliceIcon,
  LockIcon,
} from '@phosphor-icons/react'

interface NavItem {
  path: string
  label: string
  Icon: React.ElementType
  locked?: boolean
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard',    Icon: ChartBarIcon },
  { path: '/wallet',    label: 'My Positions', Icon: WalletIcon },
  { path: '/discover',  label: 'Discover',     Icon: MagnifyingGlassIcon, locked: true },
  { path: '/learn',     label: 'Learn',        Icon: GraduationCapIcon },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const close = () => setOpen(false)

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm hover:text-indigo-600 transition-colors truncate"
          >
            <ChartPieSliceIcon size={18} weight="duotone" className="text-indigo-600 shrink-0" />
            Uniswap Analyzer
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 shrink-0">
          {navItems.map(({ path, label, locked }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
              {locked && <LockIcon size={11} weight="bold" className="opacity-40" />}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        >
          {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1">
          {navItems.map(({ path, label, Icon, locked }) => (
            <Link
              key={path}
              to={path}
              onClick={close}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} weight={isActive(path) ? 'bold' : 'regular'} />
              {label}
              {locked && <LockIcon size={11} weight="bold" className="ml-auto opacity-40" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
