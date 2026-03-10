import { useState } from 'react'
import Dashboard  from './pages/Dashboard.tsx'
import PoolDetail from './pages/PoolDetail.tsx'

export default function App() {
  const [selected, setSelected] = useState<{ chain: string; address: string } | null>(null)

  return (
    <div className="min-h-screen bg-gray-950">
      {selected ? (
        <PoolDetail
          chain={selected.chain}
          address={selected.address}
          onBack={() => setSelected(null)}
        />
      ) : (
        <Dashboard onSelectPool={(chain, address) => setSelected({ chain, address })} />
      )}
    </div>
  )
}
