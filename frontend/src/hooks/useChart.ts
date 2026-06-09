import { useQuery } from '@tanstack/react-query'
import { chartApi } from '@/api/chart.api'

export function useChart(ticker: string | null, period = '1y') {
  return useQuery({
    queryKey: ['chart', ticker, period],
    queryFn: () => chartApi.getChart(ticker!, period),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}
