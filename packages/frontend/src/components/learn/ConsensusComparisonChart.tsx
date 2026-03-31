import { useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

/* ── Tab 1: PoW vs PoS comparison metrics ── */
const comparisonData = [
  { metric: 'Energia (kWh/tx)', pow: 1_173, pos: 0.003, unit: 'kWh' },
  { metric: 'Finalità', pow: 60, pos: 12, unit: 'minuti' },
  { metric: 'Hardware min.', pow: 5_000, pos: 0, unit: '$ USD' },
  { metric: 'Capitale min.', pow: 0, pos: 51_200, unit: '$ USD (32 ETH)' },
]

/* ── Tab 2: Validator selection simulator ── */
interface Validator { name: string; stake: number; selected: boolean }

function createValidators(userStake: number): Validator[] {
  const others = [
    { name: 'Lido', stake: 320 },
    { name: 'Coinbase', stake: 200 },
    { name: 'Kraken', stake: 120 },
    { name: 'Binance', stake: 96 },
    { name: 'Rocket Pool', stake: 64 },
    { name: 'Staked.us', stake: 48 },
    { name: 'Figment', stake: 40 },
    { name: 'Allnodes', stake: 32 },
    { name: 'Kiln', stake: 32 },
  ]
  return [{ name: 'Tu', stake: userStake, selected: false }, ...others.map((v) => ({ ...v, selected: false }))]
}

function selectProposerFixed(validators: Validator[]): Validator[] {
  const totalStake = validators.reduce((s, v) => s + v.stake, 0)
  const rand = Math.random() * totalStake
  let cumulative = 0
  let selectedIdx = validators.length - 1
  for (let i = 0; i < validators.length; i++) {
    cumulative += validators[i].stake
    if (rand < cumulative) { selectedIdx = i; break }
  }
  return validators.map((v, i) => ({ ...v, selected: i === selectedIdx }))
}

type Tab = 'comparison' | 'validator'

export default function ConsensusComparisonChart() {
  const [tab, setTab] = useState<Tab>('comparison')
  const [userStake, setUserStake] = useState(32)
  const [validators, setValidators] = useState<Validator[]>(() => createValidators(32))
  const [epochCount, setEpochCount] = useState(0)
  const [userWins, setUserWins] = useState(0)

  const simulateEpoch = useCallback(() => {
    const vals = createValidators(userStake)
    const result = selectProposerFixed(vals)
    setValidators(result)
    setEpochCount((c) => c + 1)
    if (result[0].selected) setUserWins((w) => w + 1)
  }, [userStake])

  const totalStake = useMemo(() => validators.reduce((s, v) => s + v.stake, 0), [validators])
  const userProbability = useMemo(() => ((userStake / totalStake) * 100).toFixed(2), [userStake, totalStake])

  const chartData = useMemo(
    () => validators.map((v) => ({
      name: v.name,
      stake: v.stake,
      probability: Math.round((v.stake / totalStake) * 10000) / 100,
      selected: v.selected,
    })),
    [validators, totalStake],
  )

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => setTab('comparison')}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'comparison'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Confronto Metriche
        </button>
        <button
          onClick={() => setTab('validator')}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'validator'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Selezione Validatore
        </button>
      </div>

      {/* Tab 1: Comparison */}
      {tab === 'comparison' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {comparisonData.map((d) => (
              <div key={d.metric} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{d.metric}</div>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">PoW</div>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {d.pow.toLocaleString('it-IT')}
                    </div>
                  </div>
                  <div className="text-slate-300 dark:text-slate-600">vs</div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">PoS</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {d.pos.toLocaleString('it-IT')}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1">{d.unit}</div>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300">
            <strong className="text-emerald-700 dark:text-emerald-400">Il dato chiave:</strong>{' '}
            Ethereum è passata da PoW a PoS il 15 settembre 2022 ("The Merge"),
            riducendo il consumo energetico del <strong>99.95%</strong>.
          </div>
        </div>
      )}

      {/* Tab 2: Validator selection */}
      {tab === 'validator' && (
        <div className="space-y-4">
          {/* Stake slider */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Il tuo stake: <span className="text-slate-800 dark:text-slate-200 font-medium">{userStake} ETH</span>
              <span className="ml-2 text-slate-400">(probabilità: {userProbability}%)</span>
            </label>
            <input
              type="range" min={32} max={200} step={32} value={userStake}
              onChange={(e) => {
                setUserStake(+e.target.value)
                setValidators(createValidators(+e.target.value))
                setEpochCount(0)
                setUserWins(0)
              }}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>32 ETH (1 validatore)</span><span>200 ETH</span>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Stake (ETH)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(v: number) => [`${v} ETH`, 'Stake']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="stake" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.selected ? '#10b981' : entry.name === 'Tu' ? '#f59e0b' : '#94a3b8'}
                    stroke={entry.selected ? '#059669' : 'none'}
                    strokeWidth={entry.selected ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Simulate button + results */}
          <div className="flex items-center gap-4">
            <button
              onClick={simulateEpoch}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Simula Epoca
            </button>
            {epochCount > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Epoche: <strong className="text-slate-700 dark:text-slate-200">{epochCount}</strong>
                {' · '}Selezionato: <strong className="text-emerald-600 dark:text-emerald-400">{userWins}×</strong>
                {' '}({epochCount > 0 ? ((userWins / epochCount) * 100).toFixed(1) : '0'}%)
              </span>
            )}
          </div>

          {validators.some((v) => v.selected) && (
            <div className={`rounded-lg p-3 text-sm border ${
              validators[0].selected
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              <strong>
                {validators.find((v) => v.selected)?.name}
              </strong>{' '}
              è stato selezionato come block proposer per questa epoca!
              {validators[0].selected && ' 🎉'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
