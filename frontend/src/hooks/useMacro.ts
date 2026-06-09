import { useQuery } from '@tanstack/react-query'
import { macroApi } from '@/api/macro.api'

export function useMacro() {
  return useQuery({
    queryKey: ['macro'],
    queryFn: () => macroApi.getMacro(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}
