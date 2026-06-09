import { Sun, Moon, Search } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatNumber } from '@/lib/utils'

export function Header() {
  const { theme, toggleTheme } = useAppStore()
  const { data: exchangeData } = useExchangeRate()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="종목 검색 (예: AAPL, 삼성전자)"
          className="toss-input pl-10 py-2.5 text-body-2"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Exchange Rate */}
        {exchangeData && (
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2">
            <span className="text-caption text-muted-foreground">USD/KRW</span>
            <span className="text-body-2 font-semibold tabular-nums">
              {formatNumber(exchangeData.rate, 2)}
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary transition-all hover:bg-accent active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  )
}
