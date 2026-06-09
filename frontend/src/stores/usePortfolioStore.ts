import { create } from 'zustand';
import type { PortfolioSummary, PortfolioDetail } from '@/types/portfolio.types';

interface PortfolioState {
  portfolios: PortfolioSummary[];
  currentPortfolio: PortfolioDetail | null;
  isLoading: boolean;
  error: string | null;

  setPortfolios: (portfolios: PortfolioSummary[]) => void;
  setCurrentPortfolio: (portfolio: PortfolioDetail | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPortfolio: (portfolio: PortfolioSummary) => void;
  removePortfolio: (id: number) => void;
  updatePortfolio: (portfolio: PortfolioSummary) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolios: [],
  currentPortfolio: null,
  isLoading: false,
  error: null,

  setPortfolios: (portfolios) => set({ portfolios }),
  setCurrentPortfolio: (portfolio) => set({ currentPortfolio: portfolio }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addPortfolio: (portfolio) =>
    set((state) => ({ portfolios: [portfolio, ...state.portfolios] })),
  removePortfolio: (id) =>
    set((state) => ({
      portfolios: state.portfolios.filter((p) => p.id !== id),
      currentPortfolio: state.currentPortfolio?.id === id ? null : state.currentPortfolio,
    })),
  updatePortfolio: (portfolio) =>
    set((state) => ({
      portfolios: state.portfolios.map((p) => (p.id === portfolio.id ? portfolio : p)),
    })),
}));
