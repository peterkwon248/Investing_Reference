import apiClient from './client';
import type {
  PortfolioSummary,
  PortfolioDetail,
  CreatePortfolioRequest,
  AddPositionRequest,
  Position,
  Trade,
  Fund,
} from '@/types/portfolio.types';

export const portfoliosApi = {
  list: () =>
    apiClient.get<PortfolioSummary[]>('/portfolios').then(r => r.data),

  get: (id: number) =>
    apiClient.get<PortfolioDetail>(`/portfolios/${id}`).then(r => r.data),

  create: (data: CreatePortfolioRequest) =>
    apiClient.post<PortfolioSummary>('/portfolios', data).then(r => r.data),

  update: (id: number, data: Partial<CreatePortfolioRequest>) =>
    apiClient.put<PortfolioSummary>(`/portfolios/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/portfolios/${id}`),

  addPosition: (portfolioId: number, data: AddPositionRequest) =>
    apiClient.post<Position>(`/portfolios/${portfolioId}/positions`, data).then(r => r.data),

  removePosition: (portfolioId: number, positionId: number) =>
    apiClient.delete(`/portfolios/${portfolioId}/positions/${positionId}`),

  listTrades: (portfolioId: number) =>
    apiClient.get<Trade[]>(`/portfolios/${portfolioId}/trades`).then(r => r.data),

  addTrade: (portfolioId: number, data: Omit<Trade, 'id' | 'traded_at'>) =>
    apiClient.post<Trade>(`/portfolios/${portfolioId}/trades`, data).then(r => r.data),

  addFund: (portfolioId: number, data: { action: string; amount: number; note?: string }) =>
    apiClient.post<Fund>(`/portfolios/${portfolioId}/funds`, data).then(r => r.data),
};
