import apiClient from './client'
import type { MastersAnalysis } from '@/types/analysis.types'

export const analysisApi = {
  getMasters: (ticker: string): Promise<MastersAnalysis> =>
    apiClient.get(`/analysis/masters/${ticker}`).then((r) => r.data),
}
