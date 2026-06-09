import apiClient from './client'
import type { ChartData } from '@/types/chart.types'

export const chartApi = {
  getChart: (ticker: string, period = '1y'): Promise<ChartData> =>
    apiClient.get(`/analysis/chart/${ticker}`, { params: { period } }).then((r) => r.data),
}
