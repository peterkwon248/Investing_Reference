import { create } from 'zustand';
import type { Favorite } from '@/types/portfolio.types';

interface FavoritesState {
  favorites: Favorite[];
  isLoading: boolean;

  setFavorites: (favorites: Favorite[]) => void;
  addFavorite: (fav: Favorite) => void;
  removeFavorite: (ticker: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useFavoritesStore = create<FavoritesState>((set) => ({
  favorites: [],
  isLoading: false,

  setFavorites: (favorites) => set({ favorites }),
  addFavorite: (fav) =>
    set((state) => ({ favorites: [fav, ...state.favorites] })),
  removeFavorite: (ticker) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.ticker !== ticker),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
