export interface StockPrice {
  ticker: string
  name: string | null
  price: number
  change: number
  change_percent: number
  volume: number | null
  market_cap: number | null
  currency: string
}

export interface ExchangeRateData {
  rate: number
  currency_pair: string
  timestamp: string
}

export interface StockHistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}
