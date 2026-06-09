import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios.api';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import type { CreatePortfolioRequest, AddPositionRequest } from '@/types/portfolio.types';

export function usePortfolios() {
  const { setPortfolios } = usePortfolioStore();

  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const data = await portfoliosApi.list();
      setPortfolios(data);
      return data;
    },
    staleTime: 30_000,
  });
}

export function usePortfolioDetail(id: number | null) {
  const { setCurrentPortfolio } = usePortfolioStore();

  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await portfoliosApi.get(id);
      setCurrentPortfolio(data);
      return data;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  const { addPortfolio } = usePortfolioStore();

  return useMutation({
    mutationFn: (data: CreatePortfolioRequest) => portfoliosApi.create(data),
    onSuccess: (portfolio) => {
      addPortfolio(portfolio);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  const { removePortfolio } = usePortfolioStore();

  return useMutation({
    mutationFn: (id: number) => portfoliosApi.delete(id),
    onSuccess: (_, id) => {
      removePortfolio(id);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useAddPosition(portfolioId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddPositionRequest) => portfoliosApi.addPosition(portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useRemovePosition(portfolioId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (positionId: number) => portfoliosApi.removePosition(portfolioId, positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
