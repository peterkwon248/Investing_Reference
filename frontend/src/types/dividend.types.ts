export interface DividendHistoryPoint {
  year: number
  amount: number
  growth: number | null // 전년 대비 성장률 (%)
}

export type DividendGradeKey =
  | 'king'
  | 'aristocrat'
  | 'achiever'
  | 'grower'
  | 'payer'
  | 'normal'

export interface DividendData {
  ticker: string
  name: string
  currency: string // "USD" | "KRW" 등

  current_price: number
  dividend_yield: number // 배당수익률 (%)
  annual_dividend: number // 연간배당금 (최근 12개월, 1주당)
  payout_ratio: number // 배당성향 (%)
  five_year_avg_yield: number | null // 5년 평균 배당수익률 (%)
  ex_dividend_date: string | null // 배당락일 (YYYY-MM-DD)
  frequency: string // 배당 주기 라벨

  dividend_growth: number | null // 연간배당 YoY 증가율 (%)
  consecutive_increase_years: number // 연속 증가 연수
  consecutive_payment_years: number // 연속 지급 연수

  grade: string // 배당 등급 라벨
  grade_key: DividendGradeKey
  grade_desc: string // 등급 설명

  cagr_3y: number | null
  cagr_5y: number | null
  cagr_10y: number | null

  avg_dividend: number // 연평균 배당금 (1주당)
  first_dividend_year: number
  total_dividend_years: number

  history: DividendHistoryPoint[]
}
