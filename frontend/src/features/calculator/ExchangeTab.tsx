import { useMemo, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import {
  convertCurrency,
  diagnoseExchangeTiming,
  type ExchangeDirection,
  type ExchangeStats,
} from '@/lib/calculators'
import { NumberField, SectionTitle, InfoBox } from './components'

const won = (v: number, d = 0) => `₩${formatNumber(v, d)}`
const usd = (v: number, d = 2) => `$${formatNumber(v, d)}`

const toneText: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-profit', // 환율↑ / 원화 약세 → 빨강
  down: 'text-loss', // 환율↓ / 원화 강세 → 파랑
  neutral: 'text-amber-600 dark:text-amber-400',
}
const toneBg: Record<'up' | 'down' | 'neutral', string> = {
  up: 'bg-rose-50 dark:bg-rose-500/10',
  down: 'bg-blue-50 dark:bg-blue-500/10',
  neutral: 'bg-amber-50 dark:bg-amber-500/10',
}

export function ExchangeTab({ exRate }: { exRate: number }) {
  return (
    <div className="space-y-5">
      <CurrentRate exRate={exRate} />
      <Converter exRate={exRate} />
      <Diagnosis exRate={exRate} />
    </div>
  )
}

function CurrentRate({ exRate }: { exRate: number }) {
  return (
    <div className="toss-card text-center">
      <div className="text-body-2 text-muted-foreground">현재 USD/KRW 환율</div>
      <div className="mt-1 text-display font-extrabold tabular-nums text-foreground">
        {won(exRate, 2)}
      </div>
      <div className="text-caption text-muted-foreground">
        1달러 = {formatNumber(exRate, 2)}원
      </div>
    </div>
  )
}

function Converter({ exRate }: { exRate: number }) {
  const [direction, setDirection] = useState<ExchangeDirection>('krw_to_usd')
  const [amount, setAmount] = useState('1000000')

  const result = useMemo(
    () => convertCurrency(direction, Number(amount) || 0, exRate),
    [direction, amount, exRate]
  )

  const isKrwToUsd = direction === 'krw_to_usd'

  return (
    <div className="toss-card space-y-4">
      <SectionTitle>환전 계산기</SectionTitle>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setDirection(isKrwToUsd ? 'usd_to_krw' : 'krw_to_usd')
            setAmount(isKrwToUsd ? '1000' : '1000000')
          }}
          className="toss-btn-secondary"
        >
          <ArrowRightLeft className="mr-1.5 h-4 w-4" />
          {isKrwToUsd ? '원화 → 달러' : '달러 → 원화'}
        </button>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <NumberField
          label={isKrwToUsd ? '원화 금액' : '달러 금액'}
          suffix={isKrwToUsd ? '₩' : '$'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
          <div className="text-caption text-muted-foreground">환전 결과</div>
          <div className="mt-1 text-title-2 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {isKrwToUsd ? usd(result) : won(result)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 룰 기반 환전 타이밍 진단.
 * v5는 yfinance KRW=X 히스토리에서 통계를 자동 계산하지만, 브라우저에서는
 * 해당 데이터를 받을 수 없어 통계값을 직접 입력하면 동일 룰로 진단합니다.
 */
function Diagnosis({ exRate }: { exRate: number }) {
  const [open, setOpen] = useState(false)
  const [avg, setAvg] = useState(String(Math.round(exRate)))
  const [min, setMin] = useState(String(Math.round(exRate * 0.95)))
  const [max, setMax] = useState(String(Math.round(exRate * 1.05)))
  const [std, setStd] = useState(String(Math.round(exRate * 0.02)))
  const [trend, setTrend] = useState('0')

  const stats: ExchangeStats = useMemo(() => {
    const minRate = Number(min) || 0
    const maxRate = Number(max) || 0
    const percentile =
      maxRate > minRate ? ((exRate - minRate) / (maxRate - minRate)) * 100 : 50
    return {
      currentRate: exRate,
      avgRate: Number(avg) || exRate,
      minRate,
      maxRate,
      stdRate: Number(std) || 0,
      trend: Number(trend) || 0,
      percentile,
    }
  }, [exRate, avg, min, max, std, trend])

  const diagnoses = useMemo(() => diagnoseExchangeTiming(stats), [stats])

  return (
    <div className="toss-card space-y-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <SectionTitle>환전 타이밍 진단 (룰 기반)</SectionTitle>
        <span className="text-body-2 text-primary">{open ? '닫기' : '열기'}</span>
      </button>

      {open && (
        <>
          <InfoBox>
            기간 통계(평균·최저·최고·표준편차·추세)를 입력하면 현재 환율을 평가합니다. 평균
            대비 ±3%, 추세 ±2%, 변동성 3%, 백분위 20/80 기준으로 진단합니다.
          </InfoBox>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField label="기간 평균" value={avg} onChange={(e) => setAvg(e.target.value)} />
            <NumberField label="기간 최저" value={min} onChange={(e) => setMin(e.target.value)} />
            <NumberField label="기간 최고" value={max} onChange={(e) => setMax(e.target.value)} />
            <NumberField label="표준편차" value={std} onChange={(e) => setStd(e.target.value)} />
            <NumberField
              label="20일 추세 (%)"
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="기간 평균" value={won(stats.avgRate)} />
            <MiniStat
              label="평균 대비"
              value={`${stats.currentRate - stats.avgRate >= 0 ? '+' : ''}${formatNumber(
                stats.currentRate - stats.avgRate
              )}원`}
              valueClass={
                stats.currentRate - stats.avgRate >= 0 ? 'text-profit' : 'text-loss'
              }
            />
            <MiniStat label="기간 최저" value={won(stats.minRate)} valueClass="text-loss" />
            <MiniStat label="기간 최고" value={won(stats.maxRate)} valueClass="text-profit" />
          </div>

          <div className="space-y-2">
            {diagnoses.map((d, i) => (
              <div key={i} className={cn('rounded-2xl p-4', toneBg[d.tone])}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-body-1">{d.icon}</span>
                  <span className={cn('text-body-2 font-bold', toneText[d.tone])}>{d.title}</span>
                  {d.action && (
                    <span
                      className={cn(
                        'ml-auto rounded-lg px-2 py-0.5 text-caption font-bold',
                        toneText[d.tone]
                      )}
                    >
                      {d.action}
                    </span>
                  )}
                </div>
                <p className="text-caption text-muted-foreground">WHY · {d.why}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">HOW · {d.how}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-secondary p-3 text-center">
      <div className="text-caption text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-body-2 font-bold tabular-nums', valueClass ?? 'text-foreground')}>
        {value}
      </div>
    </div>
  )
}
