import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/api/stocks.api'

export function useStockPrice(ticker: string | null) {
  return useQuery({
    queryKey: ['stock-price', ticker],
    queryFn: () => stocksApi.getStock(ticker!),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

export function useStockHistory(ticker: string | null, period = '1y', interval = '1d') {
  return useQuery({
    queryKey: ['stock-history', ticker, period, interval],
    queryFn: () => stocksApi.getHistory(ticker!, period, interval),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 5,
  })
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stock-search', query],
    queryFn: () => stocksApi.search(query),
    enabled: query.length >= 1,
    staleTime: 1000 * 60 * 10,
  })
}
