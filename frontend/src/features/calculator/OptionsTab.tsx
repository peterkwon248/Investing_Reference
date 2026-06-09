import { useMemo, useState } from 'react'
import { cn, formatNumber } from '@/lib/utils'
import { calcOptionPnl, type OptionStrategy, type OptionPnlResult } from '@/lib/calculators'
import { NumberField, SectionTitle, InfoBox, StatCard } from './components'

const usd = (v: number, d = 0) => `$${formatNumber(v, d)}`

const STRATEGIES: { value: OptionStrategy; label: string }[] = [
  { value: 'long_call', label: '콜 매수 (상승 베팅)' },
  { value: 'long_put', label: '풋 매수 (하락 베팅)' },
  { value: 'short_call', label: '콜 매도 (하락/횡보)' },
  { value: 'short_put', label: '풋 매도 (상승/횡보)' },
]

export function OptionsTab() {
  const [strategy, setStrategy] = useState<OptionStrategy>('long_call')
  const [currentPrice, setCurrentPrice] = useState('100')
  const [strike, setStrike] = useState('100')
  const [premium, setPremium] = useState('5')
  const [contracts, setContracts] = useState('1')

  const result = useMemo(
    () =>
      calcOptionPnl({
        strategy,
        strike: Number(strike) || 0,
        premium: Number(premium) || 0,
        contracts: Math.max(1, Number(contracts) || 1),
        currentPrice: Number(currentPrice) || 0,
      }),
    [strategy, strike, premium, contracts, currentPrice]
  )

  const maxLossDisplay =
    result.maxLoss === null ? '무제한' : `-${usd(result.maxLoss)}`
  const maxGainDisplay =
    result.maxGain === null ? '무제한' : `+${usd(result.maxGain)}`

  return (
    <div className="space-y-5">
      <InfoBox>
        옵션 손익 시뮬레이터입니다. 전략·행사가·프리미엄·계약 수를 입력하면 만기 시 손익 곡선과
        손익분기점을 계산합니다. 1계약 = 100주 기준. (옵션 체인/IV/Max Pain은 실시간 옵션 데이터가
        필요해 제외됨)
      </InfoBox>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 입력 */}
        <div className="toss-card space-y-4">
          <SectionTitle>전략 & 조건</SectionTitle>

          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">전략 선택</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as OptionStrategy)}
              className="toss-input py-2.5 text-body-2"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="현재 기초자산가"
              suffix="$"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
            />
            <NumberField
              label="행사가"
              suffix="$"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
            />
            <NumberField
              label="프리미엄"
              suffix="$"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
            />
            <NumberField
              label="계약 수"
              value={contracts}
              onChange={(e) => setContracts(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 text-center dark:bg-blue-500/10">
            <div className="text-caption text-muted-foreground">총 투자금</div>
            <div className="mt-1 text-title-1 font-extrabold tabular-nums text-primary">
              {usd(result.totalCost)}
            </div>
            <div className="text-caption text-muted-foreground">
              {Math.max(1, Number(contracts) || 1)}계약 × ${formatNumber(Number(premium) || 0, 2)}{' '}
              × 100
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="toss-card space-y-4">
          <SectionTitle>손익 분석</SectionTitle>
          <PayoffChart result={result} currentPrice={Number(currentPrice) || 0} />
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="최대 손실" value={maxLossDisplay} valueClassName="text-loss" />
            <StatCard label="최대 이익" value={maxGainDisplay} valueClassName="text-profit" />
            <StatCard
              label="손익분기점"
              value={`$${formatNumber(result.breakeven, 2)}`}
              valueClassName="text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 만기 손익 곡선 — 경량 인라인 SVG */
function PayoffChart({
  result,
  currentPrice,
}: {
  result: OptionPnlResult
  currentPrice: number
}) {
  const { curve, breakeven } = result
  const W = 320
  const H = 180
  const PAD = 4

  const xs = curve.map((p) => p.price)
  const ys = curve.map((p) => p.pnl)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys, 0)
  const yMax = Math.max(...ys, 0)
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const px = (x: number) => PAD + ((x - xMin) / xRange) * (W - 2 * PAD)
  const py = (y: number) => PAD + (1 - (y - yMin) / yRange) * (H - 2 * PAD)

  const zeroY = py(0)
  const linePts = curve.map((p) => `${px(p.price)},${py(p.pnl)}`).join(' ')

  // 이익(녹)·손실(적) 영역 분리용 polygon
  const areaTop = curve.map((p) => `${px(p.price)},${py(p.pnl)}`)
  const profitArea = `${px(xMin)},${zeroY} ${areaTop.join(' ')} ${px(xMax)},${zeroY}`

  return (
    <div className="overflow-hidden rounded-2xl bg-secondary p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
        {/* clip: 이익 영역(0선 위) 녹색, 손실 영역(0선 아래) 빨강 */}
        <defs>
          <clipPath id="profitClip">
            <rect x="0" y="0" width={W} height={zeroY} />
          </clipPath>
          <clipPath id="lossClip">
            <rect x="0" y={zeroY} width={W} height={H - zeroY} />
          </clipPath>
        </defs>

        <polygon
          points={profitArea}
          className="fill-emerald-500/20"
          clipPath="url(#profitClip)"
        />
        <polygon points={profitArea} className="fill-rose-500/20" clipPath="url(#lossClip)" />

        {/* 0선 */}
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} className="stroke-border" strokeWidth={1} />

        {/* 손익 곡선 (이익부 녹, 손실부 적) */}
        <polyline
          points={linePts}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth={2}
          clipPath="url(#profitClip)"
        />
        <polyline
          points={linePts}
          fill="none"
          className="stroke-rose-500"
          strokeWidth={2}
          clipPath="url(#lossClip)"
        />

        {/* 현재가 라인 */}
        {currentPrice >= xMin && currentPrice <= xMax && (
          <line
            x1={px(currentPrice)}
            y1={0}
            x2={px(currentPrice)}
            y2={H}
            className="stroke-primary"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
        {/* 손익분기 라인 */}
        {breakeven >= xMin && breakeven <= xMax && (
          <line
            x1={px(breakeven)}
            y1={0}
            x2={px(breakeven)}
            y2={H}
            className="stroke-violet-500"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-caption text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" /> 현재가{' '}
          {usd(currentPrice, 1)}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-500" /> 손익분기{' '}
          {usd(breakeven, 1)}
        </span>
      </div>
    </div>
  )
}
