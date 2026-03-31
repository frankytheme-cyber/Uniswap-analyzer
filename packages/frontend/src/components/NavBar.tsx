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
    <div
      className="sticky top-0 z-20 backdrop-blur-md border-b"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-base) 92%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left — logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-semibold text-sm truncate transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <ChartPieSliceIcon size={18} weight="duotone" style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Uniswap Analyzer
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-0.5 shrink-0">
          {navItems.map(({ path, label, locked }) => (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive(path) ? 'var(--bg-raised)' : 'transparent',
                color: isActive(path) ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {label}
              {locked && <LockIcon size={11} weight="bold" style={{ opacity: 0.4 }} />}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden p-2 rounded-md transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        >
          {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="sm:hidden border-t px-4 py-2 space-y-1"
          style={{
            backgroundColor: 'var(--bg-base)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {navItems.map(({ path, label, Icon, locked }) => (
            <Link
              key={path}
              to={path}
              onClick={close}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(path) ? 'var(--bg-raised)' : 'transparent',
                color: isActive(path) ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon size={18} weight={isActive(path) ? 'bold' : 'regular'} />
              {label}
              {locked && <LockIcon size={11} weight="bold" className="ml-auto" style={{ opacity: 0.4 }} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
