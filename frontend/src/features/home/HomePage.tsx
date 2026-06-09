import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { stocksApi } from '@/api/stocks.api'
import { useFavorites, useRemoveFavorite } from '@/hooks/useFavorites'
import { useAppStore } from '@/stores/useAppStore'
import { MetricCard } from '@/components/data-display/MetricCard'
import { MetricCardSkeleton } from '@/components/common/Skeleton'
import { StockSearchInput } from '@/components/forms/StockSearchInput'
import { formatUSD, formatPercent, cn, getProfitColor } from '@/lib/utils'
import { TrendingUp, DollarSign, BarChart3, Zap, ArrowRight, Star, Search, X, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const exchangeRate = useAppStore((s) => s.exchangeRate)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const { data: favorites = [], isLoading: favoritesLoading, refetch: refetchFavorites } = useFavorites()
  const removeFavoriteMutation = useRemoveFavorite()

  // Fallback to default tickers if no favorites
  const watchedTickers = favorites.length > 0
    ? favorites.map(f => f.ticker)
    : ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL']

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['watched-stocks', watchedTickers],
    queryFn: async () => {
      const results = await Promise.allSettled(
        watchedTickers.map((t) => stocksApi.getStock(t))
      )
      return results
        .filter((r) => r.status === 'fulfilled')
        .map((r: any) => r.value)
    },
    staleTime: 1000 * 60 * 5,
    enabled: watchedTickers.length > 0,
  })

  const isLoading = favoritesLoading || stocksLoading

  const handleRemoveFavorite = async (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await removeFavoriteMutation.mutateAsync(ticker)
  }

  const handleFavoriteAdded = () => {
    refetchFavorites()
    setShowSearchModal(false)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-display text-foreground">투자 만능계산기</h1>
        <p className="text-body-1 text-muted-foreground">
          스마트한 투자 분석과 백테스팅을 한 곳에서
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="USD/KRW 환율"
              value={`₩${exchangeRate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              title="관심 종목"
              value={`${favorites.length > 0 ? favorites.length : stocks?.length || 0}개`}
              subtitle="실시간 모니터링 중"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <MetricCard
              title="시뮬레이션"
              value="4종"
              subtitle="무한매수 | DCA | 밸류리밸 | 바이앤홀드"
              icon={<Zap className="h-5 w-5" />}
            />
            <MetricCard
              title="분석 도구"
              value="13개"
              subtitle="모드 | 전략 | 차트"
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickActionCard
          to="/simulation"
          title="백테스트 시작"
          description="전략을 과거 데이터로 검증하세요"
          gradient="from-blue-500/10 to-purple-500/10"
          borderColor="border-blue-500/20"
          icon={<FlaskConicalIcon />}
        />
        <QuickActionCard
          to="/portfolio"
          title="포트폴리오 관리"
          description="실전 투자를 추적하고 관리하세요"
          gradient="from-emerald-500/10 to-teal-500/10"
          borderColor="border-emerald-500/20"
          icon={<BriefcaseIcon />}
        />
        <QuickActionCard
          to="/analysis"
          title="종목 분석"
          description="기술적 | 기본적 분석을 수행하세요"
          gradient="from-orange-500/10 to-red-500/10"
          borderColor="border-orange-500/20"
          icon={<BarChart3Icon />}
        />
      </div>

      {/* Watchlist */}
      <div className="toss-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title-3 text-foreground">관심 종목</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-2 text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
            <Link
              to="/market"
              className="flex items-center gap-1 text-body-2 text-primary hover:underline"
            >
              전체보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary" />
                  <div>
                    <div className="h-4 w-16 bg-secondary rounded mb-1" />
                    <div className="h-3 w-24 bg-secondary rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-16 bg-secondary rounded mb-1" />
                  <div className="h-3 w-12 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : stocks && stocks.length > 0 ? (
          <div className="space-y-1">
            {stocks.map((stock: any) => (
              <motion.div
                key={stock.ticker}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-body-2 font-bold text-foreground">
                    {stock.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-body-2 font-semibold text-foreground">{stock.ticker}</p>
                    <p className="text-caption text-muted-foreground">{stock.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-body-2 font-semibold tabular-nums text-foreground">
                      {formatUSD(stock.price)}
                    </p>
                    <p className={cn('text-caption font-medium tabular-nums', getProfitColor(stock.change_percent))}>
                      {formatPercent(stock.change_percent)}
                    </p>
                  </div>
                  {favorites.length > 0 && (
                    <button
                      onClick={(e) => handleRemoveFavorite(stock.ticker, e)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-loss/10 text-muted-foreground hover:text-loss transition-all"
                      title="관심종목에서 제거"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <p className="text-body-2 text-muted-foreground mb-4">관심 종목을 추가해보세요</p>
            <button
              onClick={() => setShowSearchModal(true)}
              className="toss-btn-primary px-4 py-2 inline-flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              종목 검색
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <SearchFavoriteModal
            onClose={() => setShowSearchModal(false)}
            onAdded={handleFavoriteAdded}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchFavoriteModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="w-full max-w-lg mx-4"
      >
        <div className="toss-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title-3 font-semibold text-foreground">관심 종목 추가</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
          <StockSearchInput
            onSelect={() => {
              onAdded()
            }}
            showFavoriteButton={true}
            placeholder="종목명 또는 티커 검색 (예: AAPL, 애플)"
            className="w-full"
          />
          <p className="text-caption text-muted-foreground mt-3">
            종목을 검색하고 별 아이콘을 눌러 관심 종목에 추가하세요
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function QuickActionCard({
  to, title, description, gradient, borderColor, icon
}: {
  to: string; title: string; description: string; gradient: string; borderColor: string; icon: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200 hover:shadow-toss-md',
        gradient,
        borderColor
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <h3 className="text-title-3 text-foreground">{title}</h3>
        <p className="text-body-2 text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

function FlaskConicalIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20">
      <Zap className="h-6 w-6 text-blue-400" />
    </div>
  )
}

function BriefcaseIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
      <TrendingUp className="h-6 w-6 text-emerald-400" />
    </div>
  )
}

function BarChart3Icon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
      <BarChart3 className="h-6 w-6 text-orange-400" />
    </div>
  )
}
