export interface Position {
  id: number;
  ticker: string;
  name: string;
  strategy: string;
  shares: number;
  avg_price: number;
  allocated_capital: number;
  current_price?: number;
  current_value?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  params: Record<string, any>;
}

export interface PortfolioSummary {
  id: number;
  name: string;
  description: string;
  currency: string;
  position_count: number;
  total_invested: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioDetail extends PortfolioSummary {
  positions: Position[];
}

export interface Trade {
  id: number;
  ticker: string;
  action: 'buy' | 'sell';
  price: number;
  shares: number;
  amount: number;
  commission: number;
  reason: string;
  traded_at: string;
}

export interface Fund {
  id: number;
  action: 'deposit' | 'withdraw';
  amount: number;
  note: string;
  recorded_at: string;
}

export interface Favorite {
  id: number;
  ticker: string;
  name: string;
  market: string;
  current_price?: number;
  change?: number;
  change_percent?: number;
  added_at: string;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  currency?: string;
}

export interface AddPositionRequest {
  ticker: string;
  name?: string;
  strategy?: string;
  shares?: number;
  avg_price?: number;
  allocated_capital?: number;
  params?: Record<string, any>;
}
