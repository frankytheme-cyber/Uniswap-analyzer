import NodeCache from 'node-cache'

// ── TTL Constants (seconds) ──────────────────────────────────────────────────

export const TTL = {
  POOL:           15 * 60,   // 15 min — pool base data, swaps
  TICKS:          30 * 60,   // 30 min — tick distribution
  HOUR_DATAS:     30 * 60,   // 30 min — poolHourDatas
  DAY_DATAS:      60 * 60,   // 60 min — poolDayDatas (daily, stable)
  DEFILLAMA:      60 * 60,   // 60 min — aggregated external data
  COMPETITORS:    60 * 60,   // 60 min — top pools by fee tier
  DISCOVERY:      30 * 60,   // 30 min — discovery ranked results
} as const

export type TtlKey = keyof typeof TTL

// ── CacheManager ─────────────────────────────────────────────────────────────

export class CacheManager {
  private store: NodeCache
  private pending = new Map<string, Promise<unknown>>()

  constructor() {
    this.store = new NodeCache({ useClones: false })
  }

  // Returns cached value, or calls fetchFn and stores the result.
  // Deduplicates concurrent in-flight requests for the same key.
  async get<T>(key: string, ttlKey: TtlKey, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.store.get<T>(key)
    if (cached !== undefined) return cached

    if (this.pending.has(key)) return this.pending.get(key) as Promise<T>

    const promise = fetchFn()
      .then((value) => {
        this.store.set(key, value, TTL[ttlKey])
        this.pending.delete(key)
        return value
      })
      .catch((err) => {
        this.pending.delete(key)
        throw err
      })

    this.pending.set(key, promise)
    return promise
  }

  // Force-invalidates a key so the next get() will re-fetch
  invalidate(key: string): void {
    this.store.del(key)
  }

  // Invalidates all keys matching a prefix (e.g. all data for a pool)
  invalidatePool(chain: string, poolId: string): void {
    const prefix = cacheKey(chain, poolId)
    const keys = this.store.keys().filter((k) => k.startsWith(prefix))
    this.store.del(keys)
  }

  stats(): { keys: number; hits: number; misses: number } {
    const s = this.store.getStats()
    return { keys: s.keys, hits: s.hits, misses: s.misses }
  }
}

// ── Key Builders ──────────────────────────────────────────────────────────────

export function cacheKey(chain: string, poolId: string, suffix?: string): string {
  const base = `${chain}:${poolId.toLowerCase()}`
  return suffix ? `${base}:${suffix}` : base
}

export const CACHE_KEYS = {
  pool:        (chain: string, poolId: string) => cacheKey(chain, poolId, 'pool'),
  dayDatas:    (chain: string, poolId: string, days: number) => cacheKey(chain, poolId, `dayDatas:${days}`),
  hourDatas:   (chain: string, poolId: string) => cacheKey(chain, poolId, 'hourDatas'),
  swaps:       (chain: string, poolId: string) => cacheKey(chain, poolId, 'swaps'),
  ticks:       (chain: string, poolId: string) => cacheKey(chain, poolId, 'ticks'),
  competitors:     (chain: string, feeTier: string) => `${chain}:competitors:${feeTier}`,
  discovery:       (chain: string, limit: number) => `${chain}:discovery:${limit}`,
  walletPositions: (chain: string, wallet: string, version: 'v3' | 'v4') => `${chain}:wallet:${wallet.toLowerCase()}:positions:${version}`,
} as const

// ── Singleton ─────────────────────────────────────────────────────────────────

export const cache = new CacheManager()
