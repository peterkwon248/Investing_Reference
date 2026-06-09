import { create } from 'zustand'

interface AppState {
  theme: 'light' | 'dark'
  exchangeRate: number
  sidebarOpen: boolean
  toggleTheme: () => void
  setExchangeRate: (rate: number) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  exchangeRate: 1400,
  sidebarOpen: true,
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
      return { theme: newTheme }
    }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
