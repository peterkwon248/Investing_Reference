import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Coins,
  Search,
  TrendingUp,
  AlertCircle,
  Loader2,
  Wallet,
  Percent,
  CalendarClock,
  Award,
  Flame,
  PiggyBank,
  Sparkles,
} from 'lucide-react'
import { useDividend } from '@/hooks/useDividend'
import type { DividendData, DividendGradeKey } from '@/types/dividend.types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// 인기 배당주 (v5 popular_us)
// ---------------------------------------------------------------------------
const POPULAR = ['SCHD', 'VYM', 'O', 'KO', 'JNJ', 'PG', 'VZ', 'T', 'MO', 'JEPI']

// ---------------------------------------------------------------------------
// 배당 등급 스타일 (v5 등급 색상 → 기본 팔레트로 매핑)
// ---------------------------------------------------------------------------
const GRADE_STYLE: Record<DividendGradeKey, { text: string; bg: string; icon: ReactNode }> = {
  king: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: <Award className="h-5 w-5" />,
  },
  aristocrat: {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    icon: <Award className="h-5 w-5" />,
  },
  achiever: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    icon: <Award className="h-5 w-5" />,
  },
  grower: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  payer: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    icon: <Coins className="h-5 w-5" />,
  },
  normal: {
    text: 'text-muted-foreground',
    bg: 'bg-secondary',
    icon: <Coins className="h-5 w-5" />,
  },
}

// ---------------------------------------------------------------------------
// 통화 포맷터
// ---------------------------------------------------------------------------
function makeFmt(currency: string) {
  const isKrw = currency === 'KRW'
  return {
    // 주가 / 큰 금액
    price: (v: number) =>
      isKrw
        ? `₩${v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
        : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    // 주당 배당금 (소수 정밀도 필요)
    div: (v: number) =>
      isKrw
        ? `₩${v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
        : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
    // 합계/연간 소득
    sum: (v: number) =>
      isKrw
        ? `₩${v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
        : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  }
}

function pct(v: number, signed = false): string {
  const s = signed && v > 0 ? '+' : ''
  return `${s}${v.toFixed(1)}%`
}

// ---------------------------------------------------------------------------
// 배당수익률 색상 (v5: >=3 초록, >=1.5 노랑, else 회색)
// ---------------------------------------------------------------------------
function yieldTone(y: number): string {
  if (y >= 3) return 'text-emerald-600 dark:text-emerald-400'
  if (y >= 1.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-foreground'
}

// 배당성향 색상 (v5: 30~60 초록, <80 노랑, else 빨강)
function payoutTone(p: number): string {
  if (p >= 30 && p <= 60) return 'text-emerald-600 dark:text-emerald-400'
  if (p < 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// CAGR 색상 (v5: >5 초록, >0 노랑, else 빨강)
function cagrTone(c: number): string {
  if (c > 5) return 'text-emerald-600 dark:text-emerald-400'
  if (c > 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// ---------------------------------------------------------------------------
// 지표 카드
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="toss-card">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-caption font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('text-title-3 font-extrabold text-foreground', valueClass)}>{value}</div>
      {sub && <div className="mt-1 text-caption text-muted-foreground">{sub}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 메인 페이지
// ---------------------------------------------------------------------------
export default function SuperDividendPage() {
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useDividend(ticker)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = input.trim().toUpperCase()
    if (t) setTicker(t)
  }

  const pick = (t: string) => {
    setInput(t)
    setTicker(t)
  }

  // 404 = 배당 미지급 종목 (백엔드가 None → 404)
  const isNoDividend =
    isError &&
    (error as { response?: { status?: number } } | undefined)?.response?.status === 404

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-title-1 font-bold text-foreground">슈퍼배당</h1>
          <p className="text-body-2 text-muted-foreground">배당주 전문 분석 · 배당 성장 · 미래 배당 소득 예측</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={submit} className="toss-card flex items-center gap-3">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="배당주 티커 입력 (예: SCHD, KO, JNJ, 005930.KS)"
          className="w-full bg-transparent text-body-1 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="toss-btn-primary shrink-0">
          분석
        </button>
      </form>

      {/* 인기 배당주 퀵 버튼 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <Flame className="h-3.5 w-3.5" />
          인기 배당주
        </span>
        {POPULAR.map((t) => (
          <button
            key={t}
            onClick={() => pick(t)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-body-2 font-semibold transition-colors',
              ticker === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-blue-50 dark:hover:bg-blue-500/10'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-body-2 text-muted-foreground">배당 데이터를 분석하고 있습니다...</p>
        </div>
      )}

      {/* 배당 미지급 종목 (404) */}
      {isNoDividend && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
            <Coins className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-body-1 font-semibold text-foreground">배당을 지급하지 않는 종목입니다</p>
          <p className="mt-1 text-body-2 text-muted-foreground">
            배당 이력이 있는 종목을 검색해 주세요. (예: SCHD, KO, JNJ)
          </p>
        </div>
      )}

      {/* 기타 에러 */}
      {isError && !isNoDividend && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-body-1 font-semibold text-foreground">배당 데이터를 가져오지 못했어요</p>
          <p className="mt-1 text-body-2 text-muted-foreground">티커를 확인해 주세요. (예: SCHD)</p>
        </div>
      )}

      {/* Result */}
      {data && !isLoading && <Result data={data} />}

      {/* Empty state */}
      {!ticker && !isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <PiggyBank className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-title-3 font-semibold text-foreground">배당주를 검색해보세요</h3>
          <p className="mt-1 text-body-2 text-muted-foreground">
            배당수익률 · 배당성향 · 연속 증가 연수 · 배당 성장률 · 미래 배당 소득을 분석합니다
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 결과
// ---------------------------------------------------------------------------
function Result({ data }: { data: DividendData }) {
  const fmt = useMemo(() => makeFmt(data.currency), [data.currency])
  const grade = GRADE_STYLE[data.grade_key] ?? GRADE_STYLE.normal

  const chartData = useMemo(
    () => data.history.map((h) => ({ year: String(h.year), amount: h.amount, growth: h.growth })),
    [data.history]
  )

  // 한국식 색상: 수익/상승=빨강(profit), 하락=파랑(loss)
  const barColor = '#F04452'

  return (
    <div className="space-y-6">
      {/* 종목 헤더 카드 */}
      <div className="toss-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-title-2 font-extrabold text-foreground">{data.name}</span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground">
                {data.ticker}
              </span>
            </div>
            <div className="mt-3 text-display font-extrabold text-foreground">
              {fmt.price(data.current_price)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-body-2 font-bold',
                  grade.bg,
                  grade.text
                )}
              >
                {grade.icon}
                {data.grade}
              </span>
              <span className="text-body-2 text-muted-foreground">{data.grade_desc}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            <div className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
              배당수익률
            </div>
            <div className={cn('text-title-1 font-extrabold', yieldTone(data.dividend_yield))}>
              {data.dividend_yield.toFixed(2)}%
            </div>
            <div className="text-caption text-muted-foreground">{data.frequency}</div>
          </div>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="배당수익률"
          value={`${data.dividend_yield.toFixed(2)}%`}
          sub="연간 기준"
          valueClass={yieldTone(data.dividend_yield)}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="연간 배당금"
          value={fmt.div(data.annual_dividend)}
          sub="1주당 (최근 12개월)"
        />
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="배당성향"
          value={data.payout_ratio > 0 ? `${data.payout_ratio.toFixed(1)}%` : 'N/A'}
          sub="순이익 대비"
          valueClass={data.payout_ratio > 0 ? payoutTone(data.payout_ratio) : undefined}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="연속 증가"
          value={`${data.consecutive_increase_years}년`}
          sub={`연속 지급 ${data.consecutive_payment_years}년`}
        />
      </div>

      {/* 보조 지표 카드 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="배당락일"
          value={data.ex_dividend_date ?? '정보 없음'}
          sub="다음 배당락일"
        />
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="5년 평균 수익률"
          value={data.five_year_avg_yield != null ? `${data.five_year_avg_yield.toFixed(2)}%` : 'N/A'}
          sub="과거 5년 평균"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="배당 증가율"
          value={data.dividend_growth != null ? pct(data.dividend_growth, true) : 'N/A'}
          sub="전년 대비 (YoY)"
          valueClass={
            data.dividend_growth != null
              ? data.dividend_growth >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              : undefined
          }
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="연평균 배당금"
          value={fmt.div(data.avg_dividend)}
          sub={`${data.first_dividend_year}년~ · 총 ${data.total_dividend_years}년`}
        />
      </div>

      {/* 배당 성장 (CAGR) */}
      <div className="toss-card">
        <h2 className="mb-4 flex items-center gap-2 text-title-3 font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          배당 성장률 (CAGR)
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <CagrCard label="3년" value={data.cagr_3y} />
          <CagrCard label="5년" value={data.cagr_5y} />
          <CagrCard label="10년" value={data.cagr_10y} />
        </div>
      </div>

      {/* 연도별 배당금 추이 (recharts bar) */}
      <div className="toss-card">
        <h2 className="mb-4 flex items-center gap-2 text-title-3 font-bold text-foreground">
          <Coins className="h-5 w-5 text-primary" />
          연도별 배당금 추이
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => fmt.div(v)}
              />
              <Tooltip
                cursor={{ fill: 'currentColor', opacity: 0.06 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const amount = payload[0].value as number
                  const point = payload[0].payload as { growth: number | null }
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
                      <div className="text-caption font-semibold text-muted-foreground">{label}년</div>
                      <div className="text-body-1 font-bold text-foreground">{fmt.div(amount)}</div>
                      {point.growth != null && (
                        <div
                          className={cn(
                            'text-caption font-semibold',
                            point.growth >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          전년 대비 {pct(point.growth, true)}
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DRIP / 미래 배당 소득 예측 */}
      <DividendForecast data={data} fmt={fmt} />

      {/* 연도별 배당 내역 테이블 */}
      <div className="toss-card">
        <h2 className="mb-4 flex items-center gap-2 text-title-3 font-bold text-foreground">
          <Coins className="h-5 w-5 text-primary" />
          연도별 배당 내역
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body-2">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">연도</th>
                <th className="px-3 py-2 text-right font-medium">주당 배당금</th>
                <th className="px-3 py-2 text-right font-medium">전년 대비</th>
              </tr>
            </thead>
            <tbody>
              {[...data.history].reverse().slice(0, 12).map((h) => (
                <tr key={h.year} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-semibold text-foreground">{h.year}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                    {fmt.div(h.amount)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right font-semibold',
                      h.growth == null
                        ? 'text-muted-foreground'
                        : h.growth >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {h.growth == null ? '-' : pct(h.growth, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CAGR 카드
// ---------------------------------------------------------------------------
function CagrCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-4 text-center',
        value != null ? 'bg-secondary' : 'bg-secondary'
      )}
    >
      <div className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
        {label} CAGR
      </div>
      {value != null ? (
        <div className={cn('mt-1.5 text-title-2 font-extrabold', cagrTone(value))}>
          {pct(value, true)}
        </div>
      ) : (
        <div className="mt-1.5 text-title-2 font-extrabold text-muted-foreground">N/A</div>
      )}
      <div className="mt-0.5 text-caption text-muted-foreground">
        {value != null ? '연평균 성장률' : '데이터 부족'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DRIP / 미래 배당 소득 예측 (v5 _sd_render_forecast_v2)
// projected_div = current_div * (1+g)^year, annual_income = projected_div * shares
// ---------------------------------------------------------------------------
function DividendForecast({
  data,
  fmt,
}: {
  data: DividendData
  fmt: ReturnType<typeof makeFmt>
}) {
  // 기본 성장률: 5년 CAGR → 없으면 5%, 범위 클램프
  const defaultGrowth = useMemo(() => {
    const g = data.cagr_5y ?? data.cagr_3y ?? 5
    return Math.min(20, Math.max(-5, Math.round(g * 10) / 10))
  }, [data.cagr_5y, data.cagr_3y])

  const [shares, setShares] = useState(100)
  const [growth, setGrowth] = useState(defaultGrowth)
  const [years, setYears] = useState(10)

  // 현재 연간 배당 (1주당)
  const currentDiv = data.annual_dividend
  const principal = shares * data.current_price

  const result = useMemo(() => {
    let cumulative = 0
    let finalDiv = currentDiv
    let finalIncome = 0
    let finalYoc = data.current_price > 0 ? (currentDiv / data.current_price) * 100 : 0
    for (let y = 1; y <= years; y++) {
      const projectedDiv = currentDiv * Math.pow(1 + growth / 100, y)
      const annualIncome = projectedDiv * shares
      cumulative += annualIncome
      if (y === years) {
        finalDiv = projectedDiv
        finalIncome = annualIncome
        finalYoc = data.current_price > 0 ? (projectedDiv / data.current_price) * 100 : 0
      }
    }
    const cumulativeVsPrincipal = principal > 0 ? (cumulative / principal) * 100 : 0
    return { cumulative, finalDiv, finalIncome, finalYoc, cumulativeVsPrincipal }
  }, [currentDiv, growth, years, shares, data.current_price, principal])

  if (currentDiv <= 0) return null

  return (
    <div className="toss-card">
      <h2 className="mb-1 flex items-center gap-2 text-title-3 font-bold text-foreground">
        <Sparkles className="h-5 w-5 text-primary" />
        미래 배당 소득 예측
      </h2>
      <p className="mb-4 text-body-2 text-muted-foreground">
        성장률을 적용해 향후 배당 소득과 매수가 대비 수익률(YOC)을 추정합니다
      </p>

      {/* 입력 컨트롤 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-caption font-medium text-muted-foreground">보유 주수</span>
          <input
            type="number"
            min={1}
            value={shares}
            onChange={(e) => setShares(Math.max(1, Number(e.target.value) || 1))}
            className="toss-input mt-1.5 w-full"
          />
        </label>
        <label className="block">
          <span className="text-caption font-medium text-muted-foreground">
            예상 배당 성장률 · {growth.toFixed(1)}%
          </span>
          <input
            type="range"
            min={-5}
            max={20}
            step={0.5}
            value={growth}
            onChange={(e) => setGrowth(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
          />
        </label>
        <label className="block">
          <span className="text-caption font-medium text-muted-foreground">예측 기간 · {years}년</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl bg-secondary px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-body-2 text-muted-foreground">투자 원금</span>
          <span className="text-body-1 font-bold text-foreground">{fmt.price(principal)}</span>
        </div>
      </div>

      {/* 예측 결과 카드 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50 px-4 py-4 text-center dark:bg-emerald-500/10">
          <div className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
            {years}년 후 연배당
          </div>
          <div className="mt-1.5 text-title-2 font-extrabold text-emerald-600 dark:text-emerald-400">
            {fmt.sum(result.finalIncome)}
          </div>
          <div className="mt-0.5 text-caption text-muted-foreground">주당 {fmt.div(result.finalDiv)}</div>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-4 text-center dark:bg-blue-500/10">
          <div className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
            {years}년 후 YOC
          </div>
          <div className="mt-1.5 text-title-2 font-extrabold text-blue-600 dark:text-blue-400">
            {result.finalYoc.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-caption text-muted-foreground">매수가 기준 배당률</div>
        </div>
        <div className="rounded-xl bg-violet-50 px-4 py-4 text-center dark:bg-violet-500/10">
          <div className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
            {years}년 누적 배당
          </div>
          <div className="mt-1.5 text-title-2 font-extrabold text-violet-600 dark:text-violet-400">
            {fmt.sum(result.cumulative)}
          </div>
          <div className="mt-0.5 text-caption text-muted-foreground">
            원금 대비 {result.cumulativeVsPrincipal.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}
