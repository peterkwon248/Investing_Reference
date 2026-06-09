export interface BacktestConfig {
  buy_commission: number
  sell_commission: number
  slippage: number
  fx_spread: number
  capital_gains_tax: number
  dividend_tax: number
  allow_fractional: boolean
  preset?: string
}

export interface BacktestResult {
  strategy_name: string
  strategy_type: string
  initial_capital: number
  final_value: number
  total_return: number
  total_return_amount: number
  total_cost: number
  net_return: number
  metrics: Record<string, number>
  history: Array<Record<string, any>>
  trade_count: number
}

export interface ComparisonResult {
  strategies: Array<{
    name: string
    total_return: number
    net_return: number
    mdd: number
    sharpe: number
    sortino: number
    calmar: number
    total_cost: number
    win_rate: number
  }>
  best_return: string | null
  best_sharpe: string | null
  lowest_mdd: string | null
  best_risk_adjusted: string | null
  results: BacktestResult[]
}
