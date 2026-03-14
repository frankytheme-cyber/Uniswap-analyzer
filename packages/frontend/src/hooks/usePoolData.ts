import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PoolAnalysis, WatchlistEntry, DayData, Tick, RawPool, ILResult, StrategyAnalysis, ILPerStrategy, BacktestResult, DiscoveryResult } from '../types.ts'
import { useWatchlistStore } from '../stores/watchlist-store.ts'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
console.log('[API URL TEST v3]', API, '| VITE_API_URL:', import.meta.env.VITE_API_URL)

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${r.status}`)
  }
  return r.json() as Promise<T>
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export function useWatchlist() {
  const localEntries = useWatchlistStore((s) => s.entries)
  const setEntries   = useWatchlistStore((s) => s.setEntries)

  const query = useQuery<WatchlistEntry[]>({
    queryKey:    ['watchlist'],
    queryFn:     () => fetchJson(`${API}/watchlist`),
    // Mostra subito i dati da localStorage mentre il backend risponde
    initialData: localEntries.length > 0 ? localEntries : undefined,
  })

  // Sincronizza localStorage con la risposta del backend (solo se non vuota)
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setEntries(query.data)
    }
  }, [query.data, setEntries])

  return query
}

export function useAddToWatchlist() {
  const qc       = useQueryClient()
  const addEntry = useWatchlistStore((s) => s.addEntry)
  return useMutation({
    mutationFn: (body: { chain: string; address: string }) =>
      fetch(`${API}/watchlist`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error))
        return r.json() as Promise<WatchlistEntry>
      }),
    onSuccess: (entry) => {
      addEntry(entry)
      qc.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}

export function useRemoveFromWatchlist() {
  const qc          = useQueryClient()
  const removeEntry = useWatchlistStore((s) => s.removeEntry)
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/watchlist/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      removeEntry(id)
      qc.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export function usePoolAnalysis(chain: string, address: string, enabled = true) {
  return useQuery<PoolAnalysis>({
    queryKey: ['analysis', chain, address],
    queryFn:  () => fetchJson(`${API}/analysis/${chain}/${address}`),
    enabled:  enabled && !!chain && !!address,
  })
}

export function usePoolHistory(chain: string, address: string, days: number = 30) {
  return useQuery<DayData[]>({
    queryKey: ['history', chain, address, days],
    queryFn:  () => fetchJson(`${API}/analysis/${chain}/${address}/history?days=${days}`),
    enabled:  !!chain && !!address,
  })
}

export function usePoolTicks(chain: string, address: string) {
  return useQuery<Tick[]>({
    queryKey: ['ticks', chain, address],
    queryFn:  () => fetchJson(`${API}/pools/${chain}/${address}/ticks`),
    enabled:  !!chain && !!address,
    staleTime: 30 * 60 * 1000,
  })
}

export function useRawPool(chain: string, address: string) {
  return useQuery<RawPool>({
    queryKey: ['pool-raw', chain, address],
    queryFn:  () => fetchJson(`${API}/pools/${chain}/${address}`),
    enabled:  !!chain && !!address,
    staleTime: 15 * 60 * 1000,
  })
}

export function useILData(chain: string, address: string) {
  return useQuery<ILResult>({
    queryKey: ['il', chain, address],
    queryFn:  () => fetchJson(`${API}/analysis/${chain}/${address}/il`),
    enabled:  !!chain && !!address,
    staleTime: 15 * 60 * 1000,
  })
}

export function useStrategyData(chain: string, address: string) {
  return useQuery<StrategyAnalysis>({
    queryKey:  ['strategy', chain, address],
    queryFn:   () => fetchJson(`${API}/analysis/${chain}/${address}/strategy`),
    enabled:   !!chain && !!address,
    staleTime: 15 * 60 * 1000,
  })
}

export function useILSimulatorData(chain: string, address: string) {
  return useQuery<ILPerStrategy[]>({
    queryKey:  ['il-simulator', chain, address],
    queryFn:   () => fetchJson(`${API}/analysis/${chain}/${address}/il-simulator`),
    enabled:   !!chain && !!address,
    staleTime: 15 * 60 * 1000,
  })
}

export function useBacktestData(chain: string, address: string) {
  return useQuery<BacktestResult[]>({
    queryKey:  ['backtest', chain, address],
    queryFn:   () => fetchJson(`${API}/analysis/${chain}/${address}/backtest`),
    enabled:   !!chain && !!address,
    staleTime: 15 * 60 * 1000,
  })
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export function useDiscoverPools(chain: string, limit = 10, enabled = true) {
  return useQuery<DiscoveryResult>({
    queryKey:  ['discover', chain, limit],
    queryFn:   () => fetchJson(`${API}/discover/${chain}?limit=${limit}`),
    enabled:   enabled && !!chain,
    staleTime: 30 * 60 * 1000, // 30 min — match backend DISCOVERY TTL
  })
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export function useRefreshPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ chain, address }: { chain: string; address: string }) =>
      fetch(`${API}/analysis/refresh/${chain}/${address}`, { method: 'POST' }).then((r) =>
        r.json() as Promise<PoolAnalysis>,
      ),
    onSuccess: (_data, { chain, address }) => {
      qc.invalidateQueries({ queryKey: ['analysis', chain, address] })
      qc.invalidateQueries({ queryKey: ['history', chain, address] })
    },
  })
}
