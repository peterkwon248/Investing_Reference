import { useState, type FormEvent } from 'react'
import { Landmark, Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { useMastersAnalysis } from '@/hooks/useAnalysis'
import type { Verdict } from '@/types/analysis.types'
import { cn } from '@/lib/utils'

const VERDICT: Record<Verdict, { label: string; text: string; bg: string; bar: string }> = {
  buy: {
    label: '매수',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    bar: 'bg-emerald-500',
  },
  hold: {
    label: '관망',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    bar: 'bg-amber-500',
  },
  avoid: {
    label: '비추',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    bar: 'bg-rose-500',
  },
}

const OVERALL_LABEL: Record<Verdict, string> = {
  buy: '매수 추천',
  hold: '중립 / 관망',
  avoid: '매수 비추천',
}

export default function MastersLabPage() {
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState<string | null>(null)
  const { data, isLoading, isError } = useMastersAnalysis(ticker)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = input.trim().toUpperCase()
    if (t) setTicker(t)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-title-1 font-bold text-foreground">대가분석실</h1>
          <p className="text-body-2 text-muted-foreground">5대 투자 거장의 눈으로 종목을 평가합니다</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={submit} className="toss-card flex items-center gap-3">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="종목 티커 입력 (예: AAPL, MSFT, 005930.KS)"
          className="w-full bg-transparent text-body-1 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="toss-btn-primary shrink-0">
          분석
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-body-2 text-muted-foreground">거장들이 분석 중입니다...</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-body-1 font-semibold text-foreground">분석 데이터를 가져오지 못했어요</p>
          <p className="mt-1 text-body-2 text-muted-foreground">티커를 확인해 주세요. (예: AAPL)</p>
        </div>
      )}

      {/* Result */}
      {data && (
        <>
          {/* 종합 점수 */}
          <div className="toss-card text-center">
            <p className="text-body-2 text-muted-foreground">
              {data.name} · {data.ticker}
            </p>
            <p className="mt-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              거장 종합 점수
            </p>
            <div className={cn('mt-2 text-display font-extrabold', VERDICT[data.overall_verdict].text)}>
              {data.average_score.toFixed(0)}
              <span className="text-title-3 text-muted-foreground"> /100</span>
            </div>
            <span
              className={cn(
                'mt-2 inline-block rounded-lg px-3 py-1 text-body-2 font-bold',
                VERDICT[data.overall_verdict].bg,
                VERDICT[data.overall_verdict].text
              )}
            >
              {OVERALL_LABEL[data.overall_verdict]}
            </span>
            <div className="mt-5 flex justify-center gap-8">
              <Count n={data.buy_count} label="매수" cls="text-emerald-600 dark:text-emerald-400" />
              <Count n={data.hold_count} label="관망" cls="text-amber-600 dark:text-amber-400" />
              <Count n={data.avoid_count} label="비추" cls="text-rose-600 dark:text-rose-400" />
            </div>
          </div>

          {/* 거장별 카드 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {data.masters.map((m) => {
              const v = VERDICT[m.verdict]
              return (
                <div key={m.key} className="toss-card">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-body-1 font-bold text-foreground">{m.name}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-caption font-bold', v.bg, v.text)}>
                        {v.label}
                      </span>
                    </div>
                    <span className={cn('text-title-2 font-extrabold', v.text)}>{m.score}</span>
                  </div>
                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full', v.bar)}
                      style={{ width: `${Math.min(Math.max(m.score, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-body-2 italic leading-relaxed text-muted-foreground">"{m.opinion}"</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!ticker && !isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-title-3 font-semibold text-foreground">종목을 검색해보세요</h3>
          <p className="mt-1 text-body-2 text-muted-foreground">
            버핏 · 린치 · 그레이엄 · 드러켄밀러 · 코스톨라니가 평가합니다
          </p>
        </div>
      )}
    </div>
  )
}

function Count({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div>
      <div className={cn('text-title-2 font-extrabold', cls)}>{n}</div>
      <div className="text-caption text-muted-foreground">{label}</div>
    </div>
  )
}
