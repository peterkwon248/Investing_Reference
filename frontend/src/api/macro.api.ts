import apiClient from './client'
import type { MacroData } from '@/types/macro.types'

export const macroApi = {
  getMacro: (): Promise<MacroData> =>
    apiClient.get('/analysis/macro').then((r) => r.data),
}
