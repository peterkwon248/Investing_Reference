import apiClient from './client'

export const stocksApi = {
  getExchangeRate: () => apiClient.get('/stocks/exchange-rate').then(r => r.data),
  search: (q: string) => apiClient.get('/stocks/search', { params: { q } }).then(r => r.data),
  getStock: (ticker: string) => apiClient.get(`/stocks/${ticker}`).then(r => r.data),
  getHistory: (ticker: string, period = '1y', interval = '1d') =>
    apiClient.get(`/stocks/${ticker}/history`, { params: { period, interval } }).then(r => r.data),
}
