import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/api/stocks.api'
import { useAppStore } from '@/stores/useAppStore'
import { useEffect } from 'react'

export function useExchangeRate() {
  const setExchangeRate = useAppStore((s) => s.setExchangeRate)

  const query = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: stocksApi.getExchangeRate,
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 10,
  })

  useEffect(() => {
    if (query.data?.rate) {
      setExchangeRate(query.data.rate)
    }
  }, [query.data, setExchangeRate])

  return query
}
