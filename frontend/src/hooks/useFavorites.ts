import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/api/favorites.api';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

export function useFavorites() {
  const { setFavorites, setLoading } = useFavoritesStore();

  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      setLoading(true);
      try {
        const data = await favoritesApi.list();
        setFavorites(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 60_000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { addFavorite } = useFavoritesStore();

  return useMutation({
    mutationFn: (data: { ticker: string; name?: string; market?: string }) =>
      favoritesApi.add(data),
    onSuccess: (fav) => {
      addFavorite(fav);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { removeFavorite } = useFavoritesStore();

  return useMutation({
    mutationFn: (ticker: string) => favoritesApi.remove(ticker),
    onSuccess: (_, ticker) => {
      removeFavorite(ticker);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
