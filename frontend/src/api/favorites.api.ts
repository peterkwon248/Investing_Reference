import apiClient from './client';
import type { Favorite } from '@/types/portfolio.types';

export const favoritesApi = {
  list: () =>
    apiClient.get<Favorite[]>('/favorites').then(r => r.data),

  add: (data: { ticker: string; name?: string; market?: string }) =>
    apiClient.post<Favorite>('/favorites', data).then(r => r.data),

  remove: (ticker: string) =>
    apiClient.delete(`/favorites/${ticker}`),

  check: (ticker: string) =>
    apiClient.get<{ ticker: string; is_favorite: boolean }>(`/favorites/${ticker}/check`).then(r => r.data),
};
