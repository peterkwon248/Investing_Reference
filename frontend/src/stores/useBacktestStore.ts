import { create } from 'zustand'
import type { BacktestResult, ComparisonResult } from '@/types/backtest.types'

interface BacktestState {
  // Config
  ticker: string
  capital: number
  period: string
  strategy: string

  // Results
  result: BacktestResult | null
  comparisonResult: ComparisonResult | null
  isRunning: boolean
  error: string | null

  // Actions
  setTicker: (ticker: string) => void
  setCapital: (capital: number) => void
  setPeriod: (period: string) => void
  setStrategy: (strategy: string) => void
  setResult: (result: BacktestResult | null) => void
  setComparisonResult: (result: ComparisonResult | null) => void
  setIsRunning: (running: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useBacktestStore = create<BacktestState>((set) => ({
  ticker: 'AAPL',
  capital: 10000,
  period: '1y',
  strategy: 'infinite_buy',
  result: null,
  comparisonResult: null,
  isRunning: false,
  error: null,

  setTicker: (ticker) => set({ ticker }),
  setCapital: (capital) => set({ capital }),
  setPeriod: (period) => set({ period }),
  setStrategy: (strategy) => set({ strategy }),
  setResult: (result) => set({ result }),
  setComparisonResult: (result) => set({ comparisonResult: result }),
  setIsRunning: (running) => set({ isRunning: running }),
  setError: (error) => set({ error }),
  reset: () => set({
    result: null,
    comparisonResult: null,
    isRunning: false,
    error: null,
  }),
}))
