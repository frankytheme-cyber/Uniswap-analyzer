import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistEntry } from '../types.ts'

interface WatchlistState {
  entries:       WatchlistEntry[]
  selectedId:    string | null
  setEntries:    (entries: WatchlistEntry[]) => void
  addEntry:      (entry: WatchlistEntry) => void
  removeEntry:   (id: string) => void
  setSelectedId: (id: string | null) => void
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      entries:    [],
      selectedId: null,

      setEntries: (entries) => set({ entries }),

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      removeEntry: (id) =>
        set((state) => ({
          entries:    state.entries.filter((e) => e.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      setSelectedId: (id) => set({ selectedId: id }),
    }),
    { name: 'uniswap-watchlist' },
  ),
)
