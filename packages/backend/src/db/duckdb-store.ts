import duckdb from 'duckdb'
import type { PoolDayData } from '../fetchers/graph-fetcher.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoredDayData {
  chain: string
  poolId: string
  date: number
  tvlUSD: number
  volumeUSD: number
  feesUSD: number
  txCount: number
  open: number
  high: number
  low: number
  close: number
}

// ── DuckDB Store ──────────────────────────────────────────────────────────────

export class DuckDbStore {
  private db: duckdb.Database
  private conn: duckdb.Connection

  constructor(path: string = ':memory:') {
    this.db   = new duckdb.Database(path)
    this.conn = this.db.connect()
  }

  async init(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS pool_day_datas (
        chain      VARCHAR NOT NULL,
        pool_id    VARCHAR NOT NULL,
        date       INTEGER NOT NULL,
        tvl_usd    DOUBLE,
        volume_usd DOUBLE,
        fees_usd   DOUBLE,
        tx_count   INTEGER,
        open       DOUBLE,
        high       DOUBLE,
        low        DOUBLE,
        close      DOUBLE,
        PRIMARY KEY (chain, pool_id, date)
      )
    `)

    await this.run(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id         VARCHAR PRIMARY KEY,
        chain      VARCHAR NOT NULL,
        address    VARCHAR NOT NULL,
        added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chain, address)
      )
    `)
  }

  // Upsert batch di poolDayDatas per una pool
  async upsertDayDatas(chain: string, poolId: string, dayDatas: PoolDayData[]): Promise<void> {
    if (dayDatas.length === 0) return

    const stmt = this.conn.prepare(`
      INSERT OR REPLACE INTO pool_day_datas
        (chain, pool_id, date, tvl_usd, volume_usd, fees_usd, tx_count, open, high, low, close)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const d of dayDatas) {
      await new Promise<void>((resolve, reject) => {
        stmt.run(
          chain,
          poolId.toLowerCase(),
          d.date,
          parseFloat(d.tvlUSD),
          parseFloat(d.volumeUSD),
          parseFloat(d.feesUSD),
          parseInt(d.txCount, 10),
          parseFloat(d.open),
          parseFloat(d.high),
          parseFloat(d.low),
          parseFloat(d.close),
          (err: Error | null) => (err ? reject(err) : resolve()),
        )
      })
    }

    await new Promise<void>((resolve, reject) => {
      stmt.finalize((err: Error | null) => (err ? reject(err) : resolve()))
    })
  }

  // Recupera storico per una pool (desc per data)
  async getDayDatas(chain: string, poolId: string, days: number = 365): Promise<StoredDayData[]> {
    const rows = await this.all<StoredDayData>(`
      SELECT
        chain,
        pool_id    AS poolId,
        date,
        tvl_usd    AS tvlUSD,
        volume_usd AS volumeUSD,
        fees_usd   AS feesUSD,
        tx_count   AS txCount,
        open, high, low, close
      FROM pool_day_datas
      WHERE chain = ? AND pool_id = ?
      ORDER BY date DESC
      LIMIT ?
    `, [chain, poolId.toLowerCase(), days])

    return rows
  }

  // Restituisce il timestamp dell'ultimo dato storico salvato
  async getLatestDate(chain: string, poolId: string): Promise<number | null> {
    const rows = await this.all<{ maxDate: number }>(`
      SELECT MAX(date) AS maxDate
      FROM pool_day_datas
      WHERE chain = ? AND pool_id = ?
    `, [chain, poolId.toLowerCase()])

    return rows[0]?.maxDate ?? null
  }

  // ── Watchlist ───────────────────────────────────────────────────────────────

  async addToWatchlist(id: string, chain: string, address: string): Promise<void> {
    await this.run(
      `INSERT OR IGNORE INTO watchlist (id, chain, address) VALUES (?, ?, ?)`,
      [id, chain, address.toLowerCase()],
    )
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await this.run(`DELETE FROM watchlist WHERE id = ?`, [id])
  }

  async getWatchlist(): Promise<Array<{ id: string; chain: string; address: string; addedAt: string }>> {
    return this.all(`
      SELECT id, chain, address, added_at AS addedAt
      FROM watchlist
      ORDER BY added_at ASC
    `)
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conn.run(sql, ...params, (err: Error | null) => (err ? reject(err) : resolve()))
    })
  }

  private all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.conn.all(sql, ...params, (err: Error | null, rows: T[]) =>
        err ? reject(err) : resolve(rows),
      )
    })
  }

  close(): void {
    this.conn.close()
    this.db.close()
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const db = new DuckDbStore(process.env.DB_PATH ?? ':memory:')
