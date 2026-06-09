export type Verdict = 'buy' | 'hold' | 'avoid'

export interface MasterScore {
  key: string
  name: string
  score: number
  opinion: string
  verdict: Verdict
}

export interface MastersAnalysis {
  ticker: string
  name: string
  average_score: number
  overall_verdict: Verdict
  buy_count: number
  hold_count: number
  avoid_count: number
  masters: MasterScore[]
}
