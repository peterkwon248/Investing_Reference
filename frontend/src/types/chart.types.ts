export interface Candle {
  time: string // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LinePoint {
  time: string // YYYY-MM-DD
  value: number
}

export interface ChartAnalysis {
  total_score: number

  ma_status: string
  ma_score: number

  rsi: number
  rsi_status: string
  rsi_score: number

  macd_status: string
  macd_score: number

  vol_ratio: number
  vol_status: string
  vol_score: number

  acc_ratio: number
  acc_status: string

  price_change: number

  supports: number[]
  resistances: number[]
}

export interface ChartOverlays {
  ma20: LinePoint[]
  ma60: LinePoint[]
  ma120: LinePoint[]
  rsi: LinePoint[]
  macd_hist: LinePoint[]
}

export interface ChartData {
  ticker: string
  name: string
  current_price: number
  change: number
  change_percent: number
  period: string
  high_52w: number | null
  low_52w: number | null
  analysis: ChartAnalysis
  candles: Candle[]
  overlays: ChartOverlays
}
