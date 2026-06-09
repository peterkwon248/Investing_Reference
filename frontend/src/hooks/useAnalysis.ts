import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/analysis.api'

export function useMastersAnalysis(ticker: string | null) {
  return useQuery({
    queryKey: ['masters-analysis', ticker],
    queryFn: () => analysisApi.getMasters(ticker!),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}
