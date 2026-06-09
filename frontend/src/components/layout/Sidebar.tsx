import { NavLink, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'
import {
  Home,
  Briefcase,
  FlaskConical,
  BarChart3,
  Globe,
  TrendingUp,
  Calculator,
  LineChart,
  Landmark,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '홈', icon: Home, group: 'main' },
  { path: '/portfolio', label: '포트폴리오', icon: Briefcase, group: 'main' },
  { path: '/simulation', label: '시뮬레이션', icon: FlaskConical, group: 'invest' },
  { path: '/analysis', label: '분석', icon: BarChart3, group: 'invest' },
  { path: '/super-chart', label: '슈퍼차트', icon: LineChart, group: 'invest' },
  { path: '/market', label: '마켓', icon: Globe, group: 'data' },
  { path: '/super-dividend', label: '슈퍼배당', icon: TrendingUp, group: 'data' },
  { path: '/masters-lab', label: '대가분석실', icon: Landmark, group: 'data' },
  { path: '/calculator', label: '계산기', icon: Calculator, group: 'tools' },
  { path: '/macro', label: '매크로', icon: Activity, group: 'tools' },
]

const groupLabels: Record<string, string> = {
  main: '',
  invest: '투자',
  data: '데이터',
  tools: '도구',
}

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const location = useLocation()

  const groups = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof navItems>)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-card transition-all duration-300 ease-toss',
        sidebarOpen ? 'w-[260px]' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <h1 className="text-body-2 font-bold text-foreground">투자 만능계산기</h1>
            <p className="text-caption text-muted-foreground">v6.0</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-2">
            {sidebarOpen && groupLabels[group] && (
              <p className="mb-1 px-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                {groupLabels[group]}
              </p>
            )}
            {items.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'nav-item mb-0.5',
                    isActive && 'active',
                    !sidebarOpen && 'justify-center px-0'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-border/50 p-3">
        <button
          onClick={toggleSidebar}
          className="nav-item w-full justify-center"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          {sidebarOpen && <span>접기</span>}
        </button>
      </div>
    </aside>
  )
}
