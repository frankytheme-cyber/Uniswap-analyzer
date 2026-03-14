import { useState } from 'react'
import Dashboard  from './pages/Dashboard.tsx'
import PoolDetail from './pages/PoolDetail.tsx'
import Discover   from './pages/Discover.tsx'

type View = 'dashboard' | 'discover'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [selected, setSelected] = useState<{ chain: string; address: string } | null>(null)

  // PoolDetail shown from both Dashboard and Discover
  if (selected) {
    return (
      <div className="min-h-screen bg-gray-950">
        <PoolDetail
          chain={selected.chain}
          address={selected.address}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'dashboard'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('discover')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'discover'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Discover
          </button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <Dashboard onSelectPool={(chain, address) => setSelected({ chain, address })} />
      ) : (
        <Discover
          onSelectPool={(chain, address) => setSelected({ chain, address })}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  )
}
