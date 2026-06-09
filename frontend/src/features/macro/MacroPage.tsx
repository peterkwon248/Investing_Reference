import { Globe, RefreshCw, AlertCircle, Loader2, BookOpen, Lightbulb, Clock } from 'lucide-react'
import { useMacro } from '@/hooks/useMacro'
import type {
  MacroData,
  MacroColorKey,
  StrategyTone,
  IndicatorSignal,
} from '@/types/macro.types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// 시장 상태 색상 (design-token 규칙 준수: 기본 팔레트만 사용, custom 토큰 opacity 금지)
// v5: 강세=초록 → emerald, 중립=노랑 → amber, 하락 우위=주황 → orange, 약세=빨강 → rose
// ---------------------------------------------------------------------------
const STATUS_STYLE: Record<
  MacroColorKey,
  { text: string; bg: string; bar: string; chip: string; ring: string }
> = {
  strong_bull: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-500/30',
  },
  bull: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    bar: 'bg-emerald-400',
    chip: 'bg-emerald-400 text-white',
    ring: 'ring-emerald-400/30',
  },
  neutral: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    bar: 'bg-amber-500',
    chip: 'bg-amber-500 text-white',
    ring: 'ring-amber-500/30',
  },
  bear: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    bar: 'bg-orange-500',
    chip: 'bg-orange-500 text-white',
    ring: 'ring-orange-500/30',
  },
  strong_bear: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    bar: 'bg-rose-500',
    chip: 'bg-rose-500 text-white',
    ring: 'ring-rose-500/30',
  },
}

// 신호 이모지 → 색상 점 (default 팔레트)
const DOT_COLOR: Record<string, string> = {
  '🟢': 'bg-emerald-500',
  '🟡': 'bg-amber-500',
  '🟠': 'bg-orange-500',
  '🔴': 'bg-rose-500',
}

// 전략 블록 tone → 색상 (default 팔레트)
const STRATEGY_STYLE: Record<StrategyTone, { text: string; bg: string; border: string; dot: string }> = {
  success: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  info: {
    text: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    dot: 'bg-blue-500',
  },
  warning: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
  },
  error: {
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
  },
}

// overall_score 게이지: -100..+100 → 0..100% (중앙 50%가 0점)
function scoreToPercent(score: number): number {
  const clamped = Math.min(Math.max(score, -100), 100)
  return ((clamped + 100) / 200) * 100
}

// ---------------------------------------------------------------------------
// 메인 페이지 (티커 검색 없음 - 시장 전체 스냅샷)
// ---------------------------------------------------------------------------
export default function MacroPage() {
  const { data, isLoading, isError, isFetching, refetch } = useMacro()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-title-1 font-bold text-foreground">매크로</h1>
            <p className="text-body-2 text-muted-foreground">
              글로벌 지표 기반 AI 시장 진단 &amp; 전략 제안
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="toss-btn-secondary inline-flex shrink-0 items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-body-2 text-muted-foreground">시장 데이터를 분석하고 있습니다...</p>
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-body-1 font-semibold text-foreground">시장 데이터를 가져오지 못했어요</p>
          <p className="mt-1 text-body-2 text-muted-foreground">
            인터넷 연결을 확인하고 새로고침 해주세요.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="toss-btn-primary mt-5 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
        </div>
      )}

      {/* Result */}
      {data && !isLoading && <Result data={data} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 결과
// ---------------------------------------------------------------------------
function Result({ data }: { data: MacroData }) {
  const s = STATUS_STYLE[data.market_status.color_key] ?? STATUS_STYLE.neutral
  const scoreLabel = `${data.overall_score >= 0 ? '+' : ''}${data.overall_score}`

  return (
    <div className="space-y-6">
      {/* 시장 진단 메인 카드 */}
      <div className={cn('toss-card ring-1', s.bg, s.ring)}>
        {/* 상단: AI 진단 칩 + 상태명 + 종합 스코어 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-caption font-bold', s.chip)}>
              AI 진단
            </span>
            <span className={cn('text-title-2 font-extrabold', s.text)}>
              {data.market_status.status}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5">
            <span className="text-caption text-muted-foreground">종합 스코어</span>
            <span className={cn('text-title-3 font-extrabold', s.text)}>{scoreLabel}점</span>
          </div>
        </div>

        {/* 스코어 게이지 (-100 ~ +100) */}
        <div className="mt-4">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full transition-all', s.bar)}
              style={{ width: `${scoreToPercent(data.overall_score)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-caption text-muted-foreground">
            <span>약세 -100</span>
            <span>중립 0</span>
            <span>강세 +100</span>
          </div>
        </div>

        {/* WHY 설명 */}
        <div className="mt-5 rounded-xl border-l-4 border-blue-400 bg-blue-50 p-4 dark:bg-blue-500/10">
          <div className="mb-1.5 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-body-2 font-semibold text-blue-600 dark:text-blue-400">
              WHY - 현재 시장을 이렇게 판단하는 이유
            </span>
          </div>
          <p className="text-body-2 leading-relaxed text-foreground">{data.market_status.why}</p>
        </div>

        {/* 추천 행동 */}
        <div className={cn('mt-3 rounded-xl border p-4', STRATEGY_STYLE.success.border, STRATEGY_STYLE.success.bg)}>
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-body-2 font-semibold text-emerald-600 dark:text-emerald-400">
              추천 행동
            </span>
          </div>
          <p className="text-body-1 font-medium text-foreground">{data.market_status.action}</p>
        </div>
      </div>

      {/* 주요 지표별 해석 */}
      {data.signals.length > 0 && (
        <div className="toss-card">
          <h2 className="mb-4 text-title-3 font-bold text-foreground">주요 지표별 해석</h2>
          <div className="divide-y divide-border">
            {data.signals.map((sig, i) => (
              <SignalRow key={`${sig.name}-${i}`} signal={sig} />
            ))}
          </div>
        </div>
      )}

      {/* 전략 제안 */}
      <StrategyCard data={data} />

      {/* 분석 시점 / 디스클레이머 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-caption text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>분석 시점: {data.as_of}</span>
        <span className="hidden sm:inline">·</span>
        <span>💡 {data.disclaimer}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 신호 행
// ---------------------------------------------------------------------------
function SignalRow({ signal }: { signal: IndicatorSignal }) {
  const dot = DOT_COLOR[signal.emoji] ?? 'bg-muted-foreground'
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:w-32 sm:shrink-0">
        <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', dot)} />
        <span className="truncate text-body-1 font-bold text-foreground">{signal.name}</span>
      </div>
      <div className="text-body-2 text-muted-foreground sm:w-36 sm:shrink-0 pl-5 sm:pl-0">
        {signal.value}
      </div>
      <div className="text-body-2 font-medium text-foreground sm:w-40 sm:shrink-0 pl-5 sm:pl-0">
        {signal.status}
      </div>
      <div className="flex items-start gap-1.5 text-caption text-muted-foreground pl-5 sm:pl-0 sm:flex-1">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{signal.advice}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 전략 제안 카드
// ---------------------------------------------------------------------------
function StrategyCard({ data }: { data: MacroData }) {
  const t = STRATEGY_STYLE[data.strategy.tone] ?? STRATEGY_STYLE.info
  return (
    <div className="toss-card">
      <h2 className="mb-4 text-title-3 font-bold text-foreground">현재 시장에서의 전략 제안</h2>
      <div className={cn('rounded-xl border p-4', t.border, t.bg)}>
        <div className={cn('mb-3 flex items-center gap-2 text-body-1 font-bold', t.text)}>
          <Lightbulb className="h-5 w-5" />
          {data.strategy.title}
        </div>
        <ul className="space-y-2">
          {data.strategy.points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-body-2 text-foreground">
              <span className={cn('mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
