import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-toss',
          sidebarOpen ? 'ml-[260px]' : 'ml-[72px]'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
