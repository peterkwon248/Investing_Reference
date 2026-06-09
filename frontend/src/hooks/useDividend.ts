import { useQuery } from '@tanstack/react-query'
import { dividendApi } from '@/api/dividend.api'

export function useDividend(ticker: string | null) {
  return useQuery({
    queryKey: ['dividend', ticker],
    queryFn: () => dividendApi.getDividend(ticker!),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}
