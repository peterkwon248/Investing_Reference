import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import {
  LineChart,
  Search,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Activity,
  BarChart3,
  Gauge,
} from 'lucide-react'
import { useChart } from '@/hooks/useChart'
import type { ChartData } from '@/types/chart.types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// 판정 (v5 _ca_render_verdict_v3 thresholds: 70/55/45/30)
// ---------------------------------------------------------------------------
type VerdictTone = 'buy' | 'hold' | 'sell'

interface VerdictInfo {
  label: string
  tone: VerdictTone
  action: string
}

function getVerdict(score: number): VerdictInfo {
  if (score >= 70)
    return { label: '매수 유리', tone: 'buy', action: '적극적인 매수를 고려할 만한 구간입니다. 분할 매수로 진입을 검토하세요.' }
  if (score >= 55)
    return { label: '매수 관심', tone: 'buy', action: '매수 관심 구간입니다. 추가 상승 신호 확인 후 진입을 고려하세요.' }
  if (score >= 45)
    return { label: '관망', tone: 'hold', action: '방향성이 불명확합니다. 명확한 신호가 나올 때까지 기다리세요.' }
  if (score >= 30)
    return { label: '매도 관심', tone: 'sell', action: '하락 위험이 있습니다. 보유 중이라면 비중 축소를 고려하세요.' }
  return { label: '매도 유리', tone: 'sell', action: '매수 금지 구간입니다. 보유 중이라면 손절을 고려하세요.' }
}

const TONE_STYLE: Record<VerdictTone, { text: string; bg: string; bar: string; chip: string }> = {
  buy: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-500',
  },
  hold: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    bar: 'bg-amber-500',
    chip: 'bg-amber-500',
  },
  sell: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    bar: 'bg-rose-500',
    chip: 'bg-rose-500',
  },
}

// ---------------------------------------------------------------------------
// 지표 라벨 매핑 (v5)
// ---------------------------------------------------------------------------
const MA_LABELS: Record<string, string> = {
  perfect_bull: '정배열',
  bull: '정배열 ↗',
  weak_bull: '단기상승',
  perfect_bear: '역배열',
  bear: '역배열 ↘',
  weak_bear: '단기하락',
  neutral: '혼조',
}

const RSI_LABELS: Record<string, string> = {
  oversold: '과매도',
  buy_interest: '매수관심',
  overbought: '과매수',
  sell_interest: '매도관심',
  neutral: '중립',
}

const MACD_LABELS: Record<string, string> = {
  golden_cross: '골든크로스',
  dead_cross: '데드크로스',
  bullish_momentum: '상승중',
  weakening_bull: '둔화',
  bearish_momentum: '하락중',
  recovering: '회복중',
  neutral: '중립',
}

const VOL_LABELS: Record<string, string> = {
  strong_buy: '강한매수',
  exhaustion: '소진',
  strong_sell: '강한매도',
  hollow_rise: '속빈상승',
  neutral: '평균',
}

const ACC_LABELS: Record<string, string> = {
  accumulation: '매집',
  distribution: '분산',
  neutral: '중립',
}

// 상태 → tone (색상)
const POS = new Set([
  'perfect_bull',
  'bull',
  'weak_bull',
  'oversold',
  'buy_interest',
  'golden_cross',
  'bullish_momentum',
  'strong_buy',
  'exhaustion',
  'accumulation',
])
const NEG = new Set([
  'perfect_bear',
  'bear',
  'weak_bear',
  'overbought',
  'sell_interest',
  'dead_cross',
  'bearish_momentum',
  'strong_sell',
  'hollow_rise',
  'distribution',
])

function statusTone(status: string): VerdictTone {
  if (POS.has(status)) return 'buy'
  if (NEG.has(status)) return 'sell'
  return 'hold'
}

// 색상 (한국식: 상승/수익=빨강, 하락/손실=파랑)
const UP_COLOR = '#F04452'
const DOWN_COLOR = '#3182F6'

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function fmtPrice(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------------------------------------------------------------------------
// 차트 컴포넌트 (candlestick + MA20/60/120)
// ---------------------------------------------------------------------------
function CandleChart({ data }: { data: ChartData }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const dark = isDark()
    const textColor = dark ? '#B0B8C1' : '#4E5968'
    const gridColor = dark ? '#2B3340' : '#E5E8EB'

    const chart: IChartApi = createChart(el, {
      width: el.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily:
          "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor, style: 1 },
        horzLines: { color: gridColor, style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
      handleScale: true,
      handleScroll: true,
    })

    const candleSeries: ISeriesApi<'Candlestick'> = chart.addCandlestickSeries({
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    })
    candleSeries.setData(
      data.candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    )

    const addMa = (points: { time: string; value: number }[], color: string, title: string) => {
      if (!points.length) return
      const s = chart.addLineSeries({
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title,
      })
      s.setData(points.map((p) => ({ time: p.time as Time, value: p.value })))
    }

    addMa(data.overlays.ma20, '#F59E0B', 'MA20')
    addMa(data.overlays.ma60, '#8B5CF6', 'MA60')
    addMa(data.overlays.ma120, '#10B981', 'MA120')

    chart.timeScale().fitContent()

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [data])

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <Legend color="#F59E0B" label="MA20" />
        <Legend color="#8B5CF6" label="MA60" />
        <Legend color="#10B981" label="MA120" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// RSI 라인 차트
// ---------------------------------------------------------------------------
function RsiChart({ data }: { data: ChartData }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !data.overlays.rsi.length) return

    const dark = isDark()
    const textColor = dark ? '#B0B8C1' : '#4E5968'
    const gridColor = dark ? '#2B3340' : '#E5E8EB'

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 160,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'Pretendard, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor, style: 1 },
        horzLines: { color: gridColor, style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
    })

    const series = chart.addLineSeries({
      color: '#3182F6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    })
    series.setData(data.overlays.rsi.map((p) => ({ time: p.time as Time, value: p.value })))

    // 과매수(70) / 과매도(30) 기준선
    series.createPriceLine({
      price: 70,
      color: '#F04452',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '과매수',
    })
    series.createPriceLine({
      price: 30,
      color: '#3182F6',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '과매도',
    })

    chart.timeScale().fitContent()

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [data])

  if (!data.overlays.rsi.length) return null

  return <div ref={containerRef} className="w-full" />
}

// ---------------------------------------------------------------------------
// MACD 히스토그램
// ---------------------------------------------------------------------------
function MacdChart({ data }: { data: ChartData }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !data.overlays.macd_hist.length) return

    const dark = isDark()
    const textColor = dark ? '#B0B8C1' : '#4E5968'
    const gridColor = dark ? '#2B3340' : '#E5E8EB'

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 160,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'Pretendard, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor, style: 1 },
        horzLines: { color: gridColor, style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
    })

    const series = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
    })
    series.setData(
      data.overlays.macd_hist.map((p) => ({
        time: p.time as Time,
        value: p.value,
        color: p.value >= 0 ? UP_COLOR : DOWN_COLOR,
      }))
    )

    chart.timeScale().fitContent()

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [data])

  if (!data.overlays.macd_hist.length) return null

  return <div ref={containerRef} className="w-full" />
}

// ---------------------------------------------------------------------------
// 지표 readout 카드
// ---------------------------------------------------------------------------
function IndicatorCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  sub: string
  tone: VerdictTone
}) {
  const t = TONE_STYLE[tone]
  return (
    <div className="toss-card">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-caption font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('text-title-3 font-extrabold', t.text)}>{value}</div>
      <div className="mt-1 text-caption text-muted-foreground">{sub}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 메인 페이지
// ---------------------------------------------------------------------------
export default function SuperChartPage() {
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState<string | null>(null)
  const { data, isLoading, isError } = useChart(ticker)

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
          <LineChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-title-1 font-bold text-foreground">슈퍼차트</h1>
          <p className="text-body-2 text-muted-foreground">기술적 분석 기반 실시간 매매 진단 리포트</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={submit} className="toss-card flex items-center gap-3">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="종목 티커 입력 (예: AAPL, NVDA, 005930.KS)"
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
          <p className="mt-3 text-body-2 text-muted-foreground">차트를 분석하고 있습니다...</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-body-1 font-semibold text-foreground">차트 데이터를 가져오지 못했어요</p>
          <p className="mt-1 text-body-2 text-muted-foreground">티커를 확인해 주세요. (예: AAPL)</p>
        </div>
      )}

      {/* Result */}
      {data && !isLoading && <Result data={data} />}

      {/* Empty state */}
      {!ticker && !isLoading && (
        <div className="toss-card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-title-3 font-semibold text-foreground">종목을 검색해보세요</h3>
          <p className="mt-1 text-body-2 text-muted-foreground">
            이동평균 · RSI · MACD · 거래량을 종합해 매매 신호를 진단합니다
          </p>
        </div>
      )}
    </div>
  )
}

function Result({ data }: { data: ChartData }) {
  const a = data.analysis
  const verdict = getVerdict(a.total_score)
  const tone = TONE_STYLE[verdict.tone]
  const up = data.change >= 0

  return (
    <div className="space-y-6">
      {/* 종목 프리미엄 카드 */}
      <div className="toss-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-title-2 font-extrabold text-foreground">{data.name}</span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground">
                {data.ticker}
              </span>
            </div>
            <div className={cn('mt-3 text-display font-extrabold', up ? 'text-profit' : 'text-loss')}>
              {fmtPrice(data.current_price)}
            </div>
            <div className={cn('mt-1 flex items-center gap-1.5 text-body-1 font-semibold', up ? 'text-profit' : 'text-loss')}>
              {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {up ? '+' : ''}
              {fmtPrice(data.change)} ({up ? '+' : ''}
              {data.change_percent.toFixed(2)}%)
            </div>
          </div>
          {(data.high_52w != null || data.low_52w != null) && (
            <div className="space-y-1.5 text-right">
              {data.high_52w != null && (
                <div className="text-body-2 text-muted-foreground">
                  52주 최고 <span className="font-semibold text-foreground">{fmtPrice(data.high_52w)}</span>
                </div>
              )}
              {data.low_52w != null && (
                <div className="text-body-2 text-muted-foreground">
                  52주 최저 <span className="font-semibold text-foreground">{fmtPrice(data.low_52w)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 차트 */}
      <div className="toss-card">
        <h2 className="mb-4 text-title-3 font-bold text-foreground">가격 차트</h2>
        <CandleChart data={data} />
      </div>

      {/* 판정 카드 */}
      <div className={cn('toss-card text-center', tone.bg)}>
        <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
          종합 진단
        </p>
        <div className={cn('mt-2 text-display font-extrabold', tone.text)}>{verdict.label}</div>
        <div className="mt-3 inline-flex items-center gap-2">
          <span className="text-body-2 text-muted-foreground">종합 점수</span>
          <span className={cn('text-title-3 font-extrabold', tone.text)}>{a.total_score}</span>
          <span className="text-body-2 text-muted-foreground">/100</span>
        </div>
        {/* 점수 게이지 */}
        <div className="mx-auto mt-3 h-2.5 max-w-md overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full transition-all', tone.bar)}
            style={{ width: `${Math.min(Math.max(a.total_score, 0), 100)}%` }}
          />
        </div>
        <p className="mx-auto mt-4 max-w-lg text-body-2 leading-relaxed text-muted-foreground">
          {verdict.action}
        </p>
      </div>

      {/* 핵심 지표 readout */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <IndicatorCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="이동평균"
          value={MA_LABELS[a.ma_status] ?? '혼조'}
          sub="20 / 60 / 120일선"
          tone={statusTone(a.ma_status)}
        />
        <IndicatorCard
          icon={<Gauge className="h-4 w-4" />}
          label="RSI"
          value={a.rsi.toFixed(1)}
          sub={RSI_LABELS[a.rsi_status] ?? '중립'}
          tone={statusTone(a.rsi_status)}
        />
        <IndicatorCard
          icon={<Activity className="h-4 w-4" />}
          label="MACD"
          value={MACD_LABELS[a.macd_status] ?? '중립'}
          sub="시그널 대비"
          tone={statusTone(a.macd_status)}
        />
        <IndicatorCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="거래량"
          value={VOL_LABELS[a.vol_status] ?? '평균'}
          sub={`평균 대비 ${a.vol_ratio.toFixed(2)}배 · ${ACC_LABELS[a.acc_status] ?? '중립'}`}
          tone={statusTone(a.vol_status)}
        />
      </div>

      {/* RSI / MACD 보조 차트 */}
      {(data.overlays.rsi.length > 0 || data.overlays.macd_hist.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.overlays.rsi.length > 0 && (
            <div className="toss-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-title-3 font-bold text-foreground">RSI (14)</h3>
                <span className={cn('text-body-2 font-bold', statusTone(a.rsi_status) === 'buy' ? 'text-emerald-600 dark:text-emerald-400' : statusTone(a.rsi_status) === 'sell' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                  {a.rsi.toFixed(1)} · {RSI_LABELS[a.rsi_status] ?? '중립'}
                </span>
              </div>
              <RsiChart data={data} />
            </div>
          )}
          {data.overlays.macd_hist.length > 0 && (
            <div className="toss-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-title-3 font-bold text-foreground">MACD 히스토그램</h3>
                <span className="text-body-2 font-bold text-muted-foreground">
                  {MACD_LABELS[a.macd_status] ?? '중립'}
                </span>
              </div>
              <MacdChart data={data} />
            </div>
          )}
        </div>
      )}

      {/* 지지 / 저항선 */}
      {(a.supports.length > 0 || a.resistances.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="toss-card">
            <h3 className="mb-3 flex items-center gap-2 text-title-3 font-bold text-foreground">
              <TrendingDown className="h-4 w-4 text-loss" />
              지지선
            </h3>
            {a.supports.length > 0 ? (
              <div className="space-y-2">
                {a.supports.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 dark:bg-blue-500/10"
                  >
                    <span className="text-body-2 text-muted-foreground">지지 {a.supports.length - i}</span>
                    <span className="text-body-1 font-bold text-loss">{fmtPrice(s)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-2 text-muted-foreground">감지된 지지선이 없습니다.</p>
            )}
          </div>
          <div className="toss-card">
            <h3 className="mb-3 flex items-center gap-2 text-title-3 font-bold text-foreground">
              <TrendingUp className="h-4 w-4 text-profit" />
              저항선
            </h3>
            {a.resistances.length > 0 ? (
              <div className="space-y-2">
                {a.resistances.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5 dark:bg-rose-500/10"
                  >
                    <span className="text-body-2 text-muted-foreground">저항 {i + 1}</span>
                    <span className="text-body-1 font-bold text-profit">{fmtPrice(r)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-2 text-muted-foreground">감지된 저항선이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
