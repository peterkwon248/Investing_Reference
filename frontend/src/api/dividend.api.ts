import apiClient from './client'
import type { DividendData } from '@/types/dividend.types'

export const dividendApi = {
  getDividend: (ticker: string): Promise<DividendData> =>
    apiClient.get(`/analysis/dividend/${ticker}`).then((r) => r.data),
}
