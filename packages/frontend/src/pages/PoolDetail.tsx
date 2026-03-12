import { useState, useEffect } from 'react'
import {
  usePoolAnalysis, useRefreshPool, usePoolHistory, usePoolTicks,
  useRawPool, useStrategyData, useILSimulatorData, useBacktestData,
} from '../hooks/usePoolData.ts'
import ScoreMatrix      from '../components/dashboard/ScoreMatrix.tsx'
import TVLChart         from '../components/charts/TVLChart.tsx'
import VolumeChart      from '../components/charts/VolumeChart.tsx'
import FeeChart         from '../components/charts/FeeChart.tsx'
import TickHeatmap      from '../components/charts/TickHeatmap.tsx'
import ILSimulator         from '../components/charts/ILSimulator.tsx'
import StrategyAdvisor     from '../components/charts/StrategyAdvisor.tsx'
import BacktestChart       from '../components/charts/BacktestChart.tsx'
import ILManualSimulator   from '../components/charts/ILManualSimulator.tsx'

interface Props {
  chain:   string
  address: string
  onBack:  () => void
}

const STATUS_COLOR: Record<string, string> = {
  healthy: 'text-green-400',
  caution: 'text-amber-400',
  risk:    'text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Pool Sana',
  caution: 'Attenzione',
  risk:    'Rischio',
}

type Tab = 'overview' | 'charts' | 'strategy'

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Panoramica',
  charts:   'Grafici',
  strategy: 'Strategie LP',
}

export default function PoolDetail({ chain, address, onBack }: Props) {
  const [tab, setTab]                           = useState<Tab>('overview')
  const [selectedStrategyId, setSelectedStrategy] = useState('passive')

  const { data, isLoading, isError }   = usePoolAnalysis(chain, address)
  const { data: history90 = [] }       = usePoolHistory(chain, address, 90)
  const { data: history365 = [] }      = usePoolHistory(chain, address, 365)
  const { data: history30 = [] }       = usePoolHistory(chain, address, 30)
  const { data: ticks = [] }           = usePoolTicks(chain, address)
  const { data: rawPool }              = useRawPool(chain, address)
  const { data: strategyAnalysis }     = useStrategyData(chain, address)
  const { data: ilSimulatorData = [] } = useILSimulatorData(chain, address)
  const { data: backtestResults = [] } = useBacktestData(chain, address)
  const refresh                        = useRefreshPool()

  const avlRatio    = data?.parameters.find((p) => p.id === 'tvl')?.value ?? 0
  const currentTick = rawPool ? parseInt(rawPool.tick, 10) : 0
  const currentPrice = history30.length > 0 ? parseFloat(history30[0].close) : undefined

  // Inizializza la strategia selezionata con quella raccomandata
  useEffect(() => {
    if (strategyAnalysis) {
      setSelectedStrategy(strategyAnalysis.recommendedStrategy.id)
    }
  }, [strategyAnalysis?.recommendedStrategy.id])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        ← Dashboard
      </button>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-red-400">
          Errore nel caricare i dati della pool.
        </div>
      )}

      {data && (
        <>
          {/* Pool header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {data.token0}/{data.token1}
                <span className="ml-2 text-base font-normal text-gray-500">
                  {(data.feeTier / 10000).toFixed(2)}%
                </span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">
                  {chain}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  data.version === 'v4'
                    ? 'bg-violet-900 text-violet-300'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {data.version === 'v4' ? 'V4' : 'V3'}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  {data.poolAddress.slice(0, 10)}…{data.poolAddress.slice(-8)}
                </span>
              </div>
              {data.version === 'v4' && data.hooks && data.hooks !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-violet-400">hooks:</span>
                  <span className="text-xs font-mono text-gray-500">{data.hooks}</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className={`text-3xl font-bold ${STATUS_COLOR[data.overallStatus]}`}>
                {data.overallScore}
                <span className="text-base text-gray-500">/100</span>
              </div>
              <div className={`text-sm font-medium ${STATUS_COLOR[data.overallStatus]}`}>
                {STATUS_LABEL[data.overallStatus]}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-800">
            {(['overview', 'charts', 'strategy'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-white border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-300">Analisi Parametri</h2>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    data.version === 'v4'
                      ? 'bg-violet-900 text-violet-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    Uniswap {data.version === 'v4' ? 'V4' : 'V3'}
                  </span>
                </div>
                <button
                  onClick={() => refresh.mutate({ chain, address })}
                  disabled={refresh.isPending}
                  className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                >
                  {refresh.isPending ? 'Aggiornamento…' : 'Forza aggiornamento'}
                </button>
              </div>
              <ScoreMatrix parameters={data.parameters} version={data.version} />
            </div>
          )}

          {/* Charts tab */}
          {tab === 'charts' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <TVLChart dayDatas={history90} avlRatio={avlRatio} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <VolumeChart dayDatas={history30} />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <FeeChart dayDatas={history365} />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <TickHeatmap ticks={ticks} currentTick={currentTick} />
              </div>
            </div>
          )}

          {/* Strategy tab */}
          {tab === 'strategy' && (
            <div className="space-y-6">

              {/* 1. StrategyAdvisor */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                {strategyAnalysis ? (
                  <StrategyAdvisor
                    strategyAnalysis={strategyAnalysis}
                    selectedStrategyId={selectedStrategyId}
                    onSelectStrategy={setSelectedStrategy}
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
                    Caricamento analisi regime…
                  </div>
                )}
              </div>

              {/* 2. ILSimulator */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <ILSimulator
                  strategies={ilSimulatorData}
                  selectedStrategyId={selectedStrategyId}
                  onStrategyChange={setSelectedStrategy}
                  currentPrice={currentPrice}
                  token0={data.token0}
                  token1={data.token1}
                />
              </div>

              {/* 3. BacktestChart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <BacktestChart
                  results={backtestResults}
                  selectedStrategyId={selectedStrategyId}
                  onStrategyChange={setSelectedStrategy}
                />
              </div>

              {/* 4. ILManualSimulator */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <ILManualSimulator
                  initialFeeAPR={ilSimulatorData[0]?.currentFeeAPR ?? 0}
                  currentPrice={currentPrice}
                  token0={data.token0}
                  token1={data.token1}
                />
              </div>
            </div>
          )}

          {/* Last updated */}
          <p className="text-xs text-gray-600 text-right">
            Aggiornato: {new Date(data.lastUpdated).toLocaleString('it-IT')}
          </p>
        </>
      )}
    </div>
  )
}
