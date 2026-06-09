import apiClient from './client'

export const backtestsApi = {
  runInfiniteBuy: (data: any) => apiClient.post('/backtests/infinite-buy', data).then(r => r.data),
  runDCA: (data: any) => apiClient.post('/backtests/dca', data).then(r => r.data),
  runBuyAndHold: (data: any) => apiClient.post('/backtests/buy-and-hold', data).then(r => r.data),
  runValueRebalance: (data: any) => apiClient.post('/backtests/value-rebalance', data).then(r => r.data),
  compare: (data: any) => apiClient.post('/backtests/compare', data).then(r => r.data),
  getPresets: () => apiClient.get('/backtests/presets').then(r => r.data),
}
