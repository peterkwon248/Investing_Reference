import { useMemo, useState } from 'react'
import { cn, formatNumber } from '@/lib/utils'
import { calcSoulStats, simulateSoul, type SoulInput } from '@/lib/calculators'
import { NumberField, SectionTitle, InfoBox, StatCard } from './components'

const usd = (v: number, d = 0) => `$${formatNumber(v, d)}`

export function SoulTab() {
  const [shares, setShares] = useState('100')
  const [avgPrice, setAvgPrice] = useState('80')
  const [currentPrice, setCurrentPrice] = useState('40')
  const [miniCapital, setMiniCapital] = useState('1000')
  const [miniDivisions, setMiniDivisions] = useState('40')
  const [miniTarget, setMiniTarget] = useState('10')

  const input: SoulInput = useMemo(
    () => ({
      shares: Number(shares) || 0,
      avgPrice: Number(avgPrice) || 0,
      currentPrice: Number(currentPrice) || 0,
      miniCapital: Number(miniCapital) || 0,
      miniDivisions: Number(miniDivisions) || 1,
      miniTarget: Number(miniTarget) || 0,
    }),
    [shares, avgPrice, currentPrice, miniCapital, miniDivisions, miniTarget]
  )

  const stats = useMemo(() => calcSoulStats(input), [input])
  const sim = useMemo(() => simulateSoul(input), [input])

  const lossClass = stats.loss >= 0 ? 'text-profit' : 'text-loss'

  return (
    <div className="space-y-5">
      <InfoBox>
        영혼법: 현금 고갈 + 큰 손실 상태에서 소액 미니 사이클을 돌려 수익 발생 시 손실 물량을
        조금씩 청산하는 복구 전략입니다.
      </InfoBox>

      {/* 영혼 물량 입력 */}
      <div className="toss-card space-y-4">
        <SectionTitle>영혼 물량 (손실 중인 포지션)</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            label="보유 수량 (주)"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
          />
          <NumberField
            label="평균 매수가"
            suffix="$"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
          />
          <NumberField
            label="현재가"
            suffix="$"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="투자 원금" value={usd(stats.invested)} />
          <StatCard label="현재 평가액" value={usd(stats.marketValue)} />
          <StatCard label="손익 금액" value={usd(stats.loss)} valueClassName={lossClass} />
          <StatCard
            label="손익률"
            value={`${stats.lossPct.toFixed(1)}%`}
            valueClassName={lossClass}
          />
        </div>
      </div>

      {/* 미니 사이클 설정 */}
      <div className="toss-card space-y-4">
        <SectionTitle>미니 사이클 설정</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            label="미니 사이클 원금"
            suffix="$"
            value={miniCapital}
            onChange={(e) => setMiniCapital(e.target.value)}
          />
          <NumberField
            label="분할 횟수"
            value={miniDivisions}
            onChange={(e) => setMiniDivisions(e.target.value)}
          />
          <NumberField
            label="목표 수익률 (%)"
            value={miniTarget}
            onChange={(e) => setMiniTarget(e.target.value)}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          1회 매수금: {usd(stats.dailyBuy)} · 사이클당 예상 수익:{' '}
          {usd(stats.expectedProfitPerCycle)}
        </p>
      </div>

      {/* 시뮬레이션 결과 */}
      <div className="toss-card space-y-4">
        <SectionTitle>복구 시뮬레이션</SectionTitle>
        {sim.inProfit ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center dark:bg-emerald-500/10">
            <p className="text-body-1 font-bold text-emerald-600 dark:text-emerald-400">
              현재 수익 상태입니다. 영혼법이 필요하지 않습니다!
            </p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'rounded-2xl p-4 text-center',
                sim.recovered
                  ? 'bg-emerald-50 dark:bg-emerald-500/10'
                  : 'bg-amber-50 dark:bg-amber-500/10'
              )}
            >
              <p
                className={cn(
                  'text-title-3 font-bold',
                  sim.recovered
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              >
                {sim.recovered ? '복구 완료!' : '복구 진행 중'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="필요 사이클" value={`${sim.cycleCount}회`} />
              <StatCard label="예상 소요 기간" value={`${sim.monthsEstimate.toFixed(1)}개월`} />
              <StatCard
                label="청산 물량"
                value={`${formatNumber(sim.totalSharesSold, 1)}주`}
                valueClassName="text-amber-600 dark:text-amber-400"
              />
              <StatCard
                label="잔여 물량"
                value={`${formatNumber(sim.remainingShares, 1)}주`}
                valueClassName="text-primary"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
