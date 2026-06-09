export interface IndicatorSignal {
  emoji: string // 🟢 / 🟡 / 🟠 / 🔴
  name: string
  value: string
  status: string
  advice: string
}

export type MacroColorKey = 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear'

export interface MarketStatus {
  status: string
  color_key: MacroColorKey
  color_hex: string
  why: string
  action: string
}

export interface IndicatorSnapshot {
  current: number
  change_1d: number
  change_1m: number
  high_1m: number
  low_1m: number
}

export type StrategyTone = 'success' | 'info' | 'warning' | 'error'

export interface StrategyBlock {
  tone: StrategyTone
  title: string
  points: string[]
}

export interface MacroData {
  overall_score: number // -100 ~ +100
  market_status: MarketStatus
  signals: IndicatorSignal[]
  strategy: StrategyBlock
  indicators: Record<string, IndicatorSnapshot>
  as_of: string // YYYY-MM-DD HH:MM
  disclaimer: string
}
