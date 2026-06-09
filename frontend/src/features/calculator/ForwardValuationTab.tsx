import { useMemo, useState } from 'react'
import { cn, formatNumber } from '@/lib/utils'
import {
  calcForwardValuation,
  calcInvestScenario,
  reversePriceFromPer,
  reversePriceFromMarketCap,
  type ForwardValuationInput,
} from '@/lib/calculators'
import { NumberField, SectionTitle, InfoBox, StatCard } from './components'

/* ---- 포맷 헬퍼 (v5: fv_format_value / fv_format_multiple / fv_format_ratio) ---- */
const fmtPrice = (v: number | null, isUs: boolean) =>
  v === null || v === 0 ? '-' : isUs ? `$${formatNumber(v, 2)}` : `${formatNumber(v)}원`
const fmtMultiple = (v: number | null) => (v === null || v === 0 ? '-' : `${v.toFixed(2)}배`)
const fmtRatio = (v: number | null) => (v === null ? '-' : `${v.toFixed(2)}%`)
const fmtPct = (v: number | null) =>
  v === null ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

/** 변화율 → 색 (수익=빨강/플러스, 손실=파랑/마이너스) */
const upColor = (v: number | null) =>
  v === null ? 'text-muted-foreground' : v > 0 ? 'text-profit' : 'text-loss'
/** 배수처럼 낮을수록 좋은 지표는 색 반전 */
const upColorRev = (v: number | null) =>
  v === null ? 'text-muted-foreground' : v > 0 ? 'text-loss' : 'text-profit'

type FinKey =
  | 'Revenue'
  | 'Op'
  | 'Net'
  | 'NetCtrl'
  | 'Assets'
  | 'Liab'
  | 'Equity'
  | 'EquityCtrl'

const FIN_FIELDS: { key: FinKey; label: string }[] = [
  { key: 'Revenue', label: '매출액' },
  { key: 'Op', label: '영업이익' },
  { key: 'Net', label: '당기순이익' },
  { key: 'NetCtrl', label: '지배순이익' },
  { key: 'Assets', label: '자산총계' },
  { key: 'Liab', label: '부채총계' },
  { key: 'Equity', label: '자본총계' },
  { key: 'EquityCtrl', label: '지배자본' },
]

type StrMap = Record<FinKey, string>

const DEFAULT_CURRENT: StrMap = {
  Revenue: '3000000',
  Op: '500000',
  Net: '400000',
  NetCtrl: '380000',
  Assets: '5000000',
  Liab: '2000000',
  Equity: '3000000',
  EquityCtrl: '2800000',
}

export function ForwardValuationTab({ exRate }: { exRate: number }) {
  const [isUs, setIsUs] = useState(false)
  const [currentPrice, setCurrentPrice] = useState('70000')
  const [sharesMillion, setSharesMillion] = useState('5969')

  const [cur, setCur] = useState<StrMap>(DEFAULT_CURRENT)
  const [cDps, setCDps] = useState('1444')

  // 예상 실적 (수동 입력값; 비어있으면 성장률 기반 기본값 사용)
  const [fc, setFc] = useState<Partial<StrMap>>({})
  const [fDps, setFDps] = useState('')
  const [growthRate, setGrowthRate] = useState('10')

  // 목표 배수
  const [targetPer, setTargetPer] = useState('15')
  const [targetPbr, setTargetPbr] = useState('1.5')
  const [targetPsr, setTargetPsr] = useState('2')
  const [investYears, setInvestYears] = useState('3')

  const unit = isUs ? '백만$' : '억원'
  const dpsSuffix = isUs ? '$' : '원'

  const setCurField = (k: FinKey, v: string) => setCur((m) => ({ ...m, [k]: v }))
  const setFcField = (k: FinKey, v: string) => setFc((m) => ({ ...m, [k]: v }))

  // 성장률 기반 예상 기본값 (v5: 일괄 적용, app.py:7064-7094)
  // 매출/이익 = ×(1+g), 자산 = ×(1+g*0.5), 자본 = ×(1+g*0.8), 부채 = 유지
  const g = 1 + (Number(growthRate) || 0) / 100
  const assetG = 1 + ((Number(growthRate) || 0) / 100) * 0.5
  const equityG = 1 + ((Number(growthRate) || 0) / 100) * 0.8

  const forecastDefault = (k: FinKey): number => {
    const c = Number(cur[k]) || 0
    if (k === 'Liab') return c
    if (k === 'Assets') return Math.trunc(c * assetG)
    if (k === 'Equity' || k === 'EquityCtrl') return Math.trunc(c * equityG)
    return Math.trunc(c * g)
  }

  /** 예상값: 수동 입력 우선, 없으면 성장률 기본값 */
  const forecastValue = (k: FinKey): number => {
    const manual = fc[k]
    if (manual !== undefined && manual !== '') return Number(manual) || 0
    return forecastDefault(k)
  }

  const fDpsValue =
    fDps !== '' ? Number(fDps) || 0 : Math.trunc((Number(cDps) || 0) * g)

  const input: ForwardValuationInput = useMemo(
    () => ({
      isUs,
      currentPrice: Number(currentPrice) || 0,
      sharesMillion: Number(sharesMillion) || 0,
      cRevenue: Number(cur.Revenue) || 0,
      cOp: Number(cur.Op) || 0,
      cNet: Number(cur.Net) || 0,
      cNetCtrl: Number(cur.NetCtrl) || 0,
      cAssets: Number(cur.Assets) || 0,
      cLiab: Number(cur.Liab) || 0,
      cEquity: Number(cur.Equity) || 0,
      cEquityCtrl: Number(cur.EquityCtrl) || 0,
      cDps: Number(cDps) || 0,
      fRevenue: forecastValue('Revenue'),
      fOp: forecastValue('Op'),
      fNet: forecastValue('Net'),
      fNetCtrl: forecastValue('NetCtrl'),
      fAssets: forecastValue('Assets'),
      fLiab: forecastValue('Liab'),
      fEquity: forecastValue('Equity'),
      fEquityCtrl: forecastValue('EquityCtrl'),
      fDps: fDpsValue,
      targetPer: Number(targetPer) || 0,
      targetPbr: Number(targetPbr) || 0,
      targetPsr: Number(targetPsr) || 0,
      investYears: Number(investYears) || 1,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isUs,
      currentPrice,
      sharesMillion,
      cur,
      cDps,
      fc,
      fDps,
      growthRate,
      targetPer,
      targetPbr,
      targetPsr,
      investYears,
    ]
  )

  const r = useMemo(() => calcForwardValuation(input), [input])

  return (
    <div className="space-y-5">
      <InfoBox>
        재무제표(현재·예상)와 목표 배수를 입력하면 EPS/BPS·PER/PBR/PSR·적정주가를 계산합니다.
        예상 실적은 성장률로 자동 채워지며 직접 수정할 수 있습니다. (DART/yfinance 자동 로드는
        제외 — 수치를 직접 입력)
      </InfoBox>

      {/* 기본 정보 */}
      <div className="toss-card space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>기본 정보</SectionTitle>
          <div className="flex gap-2">
            <Toggle active={!isUs} onClick={() => setIsUs(false)}>
              한국 (억원/원)
            </Toggle>
            <Toggle active={isUs} onClick={() => setIsUs(true)}>
              미국 (백만$/$)
            </Toggle>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            label={isUs ? '현재가 ($)' : '현재가 (원)'}
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
          <NumberField
            label="발행주식수 (백만)"
            value={sharesMillion}
            onChange={(e) => setSharesMillion(e.target.value)}
          />
          <StatCard
            label="시가총액"
            value={
              isUs
                ? `$${formatNumber(r.marketCap / 1e12, 2)}조`
                : `${formatNumber(r.marketCap / 1e12, 2)}조`
            }
            sub={
              isUs
                ? `₩${formatNumber((r.marketCap * exRate) / 1e12)}조`
                : `$${formatNumber(r.marketCap / exRate / 1e9, 1)}B`
            }
          />
        </div>
      </div>

      {/* 재무 데이터 입력 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 현재 실적 */}
        <div className="toss-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-body-1 font-bold text-amber-600 dark:text-amber-400">
              현재 실적
            </span>
            <span className="text-caption text-muted-foreground">({unit})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIN_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={cur[f.key]}
                onChange={(e) => setCurField(f.key, e.target.value)}
              />
            ))}
            <NumberField
              label={`DPS (${dpsSuffix})`}
              value={cDps}
              onChange={(e) => setCDps(e.target.value)}
            />
          </div>
        </div>

        {/* 예상 실적 */}
        <div className="toss-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-body-1 font-bold text-emerald-600 dark:text-emerald-400">
              예상 실적
            </span>
            <span className="text-caption text-muted-foreground">({unit})</span>
          </div>

          <div className="flex items-end gap-3">
            <NumberField
              label="일괄 성장률 (%)"
              value={growthRate}
              onChange={(e) => setGrowthRate(e.target.value)}
              className="w-40"
            />
            <button
              onClick={() => {
                setFc({})
                setFDps('')
              }}
              className="toss-btn-secondary mb-0.5"
            >
              성장률로 초기화
            </button>
          </div>
          <p className="text-caption text-muted-foreground">
            매출·이익 ×{g.toFixed(2)} · 자산 ×{assetG.toFixed(2)} · 자본 ×{equityG.toFixed(2)} ·
            부채 유지 (직접 수정 가능)
          </p>

          <div className="grid grid-cols-2 gap-3">
            {FIN_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                value={String(forecastValue(f.key))}
                onChange={(e) => setFcField(f.key, e.target.value)}
              />
            ))}
            <NumberField
              label={`DPS (${dpsSuffix})`}
              value={String(fDpsValue)}
              onChange={(e) => setFDps(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 목표 배수 */}
      <div className="toss-card space-y-4">
        <SectionTitle>적정 배수 설정</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            label="목표 PER (배)"
            value={targetPer}
            onChange={(e) => setTargetPer(e.target.value)}
          />
          <NumberField
            label="목표 PBR (배)"
            value={targetPbr}
            onChange={(e) => setTargetPbr(e.target.value)}
          />
          <NumberField
            label="목표 PSR (배)"
            value={targetPsr}
            onChange={(e) => setTargetPsr(e.target.value)}
          />
          <NumberField
            label="투자 기간 (년)"
            value={investYears}
            onChange={(e) => setInvestYears(e.target.value)}
          />
        </div>
      </div>

      {/* 자동 계산 결과 */}
      <div className="toss-card space-y-5">
        <SectionTitle>자동 계산 결과</SectionTitle>

        <Group title="주당 지표">
          <StatCard label="EPS (현재)" value={fmtPrice(r.cEps, isUs)} />
          <StatCard
            label="EPS (예상)"
            value={fmtPrice(r.fEps, isUs)}
            sub={<span className={upColor(calcChangeSafe(r.cEps, r.fEps))}>{fmtPct(calcChangeSafe(r.cEps, r.fEps))}</span>}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="BPS (현재)" value={fmtPrice(r.cBps, isUs)} />
          <StatCard
            label="BPS (예상)"
            value={fmtPrice(r.fBps, isUs)}
            sub={<span className={upColor(calcChangeSafe(r.cBps, r.fBps))}>{fmtPct(calcChangeSafe(r.cBps, r.fBps))}</span>}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="DPS (현재)" value={fmtPrice(input.cDps, isUs)} />
          <StatCard
            label="DPS (예상)"
            value={fmtPrice(input.fDps, isUs)}
            sub={<span className={upColor(calcChangeSafe(input.cDps, input.fDps))}>{fmtPct(calcChangeSafe(input.cDps, input.fDps))}</span>}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
        </Group>

        <Group title="밸류에이션 배수">
          <StatCard label="PER (현재)" value={fmtMultiple(r.cPer)} />
          <StatCard
            label="PER (포워드)"
            value={fmtMultiple(r.fPer)}
            sub={<span className={upColorRev(r.fPer)}>{fmtPct(calcChangeSafe(r.cPer, r.fPer))}</span>}
          />
          <StatCard label="PBR (현재)" value={fmtMultiple(r.cPbr)} />
          <StatCard
            label="PBR (포워드)"
            value={fmtMultiple(r.fPbr)}
            sub={<span className={upColorRev(r.fPbr)}>{fmtPct(calcChangeSafe(r.cPbr, r.fPbr))}</span>}
          />
          <StatCard label="PSR (현재)" value={fmtMultiple(r.cPsr)} />
          <StatCard
            label="PSR (포워드)"
            value={fmtMultiple(r.fPsr)}
            sub={<span className={upColorRev(r.fPsr)}>{fmtPct(calcChangeSafe(r.cPsr, r.fPsr))}</span>}
          />
        </Group>

        <Group title="수익성 지표">
          <StatCard label="영업이익률 (현재)" value={fmtRatio(r.cOpMargin)} />
          <StatCard
            label="영업이익률 (예상)"
            value={fmtRatio(r.fOpMargin)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="순이익률 (현재)" value={fmtRatio(r.cNetMargin)} />
          <StatCard
            label="순이익률 (예상)"
            value={fmtRatio(r.fNetMargin)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="ROE (현재)" value={fmtRatio(r.cRoe)} />
          <StatCard
            label="ROE (예상)"
            value={fmtRatio(r.fRoe)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard label="ROA (현재)" value={fmtRatio(r.cRoa)} />
          <StatCard
            label="ROA (예상)"
            value={fmtRatio(r.fRoa)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
        </Group>

        <Group title="안정성 & 배당">
          <StatCard label="부채비율 (현재)" value={fmtRatio(r.cDebtRatio)} />
          <StatCard label="부채비율 (예상)" value={fmtRatio(r.fDebtRatio)} />
          <StatCard label="배당수익률 (현재)" value={fmtRatio(r.cDivYield)} />
          <StatCard label="배당수익률 (예상)" value={fmtRatio(r.fDivYield)} />
        </Group>
      </div>

      {/* 적정주가 & 투자 매력도 */}
      <div className="toss-card space-y-4">
        <SectionTitle>적정주가 & 투자 매력도</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FairCard
            label={`PER ${Number(targetPer).toFixed(0)}배`}
            value={fmtPrice(r.fairPer, isUs)}
            upside={r.upsidePer}
          />
          <FairCard
            label={`PBR ${Number(targetPbr).toFixed(1)}배`}
            value={fmtPrice(r.fairPbr, isUs)}
            upside={r.upsidePbr}
          />
          <FairCard
            label={`PSR ${Number(targetPsr).toFixed(1)}배`}
            value={fmtPrice(r.fairPsr, isUs)}
            upside={r.upsidePsr}
          />
          <FairCard
            label="종합 적정주가"
            value={fmtPrice(r.fairAvg, isUs)}
            upside={r.upsideAvg}
            highlight
          />
        </div>

        {r.verdict && r.discount !== null && (
          <div
            className={cn(
              'rounded-2xl p-4',
              r.discount > 10
                ? 'bg-emerald-50 dark:bg-emerald-500/10'
                : r.discount >= -10
                  ? 'bg-amber-50 dark:bg-amber-500/10'
                  : 'bg-rose-50 dark:bg-rose-500/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-body-2 font-bold text-foreground">
                현재 상태: {r.verdict}
              </span>
              <span
                className={cn(
                  'text-body-2 font-bold tabular-nums',
                  r.discount > 0 ? 'text-profit' : 'text-loss'
                )}
              >
                {fmtPct(r.discount)}
              </span>
            </div>
            {r.insight && (
              <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{r.insight}</p>
            )}
          </div>
        )}
      </div>

      <ReverseCalc input={input} fEps={r.fEps} isUs={isUs} />
      <Scenario input={input} fairAvg={r.fairAvg} isUs={isUs} />
    </div>
  )
}

/* ---------- 하위 컴포넌트 ---------- */

function calcChangeSafe(a: number | null, b: number | null): number | null {
  if (a === null || b === null || a === 0) return null
  return ((b - a) / Math.abs(a)) * 100
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl px-3 py-1.5 text-caption font-semibold transition-all',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-body-2 font-semibold text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  )
}

function FairCard({
  label,
  value,
  upside,
  highlight,
}: {
  label: string
  value: string
  upside: number | null
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 text-center',
        highlight ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-secondary'
      )}
    >
      <div className="text-caption text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 font-extrabold tabular-nums',
          highlight ? 'text-title-2 text-primary' : 'text-title-3 text-foreground'
        )}
      >
        {value}
      </div>
      <div className={cn('text-caption font-semibold', upColor(upside))}>{fmtPct(upside)}</div>
    </div>
  )
}

/** 목표 주가 역산기 (v5: app.py:7662-7726) */
function ReverseCalc({
  input,
  fEps,
  isUs,
}: {
  input: ForwardValuationInput
  fEps: number | null
  isUs: boolean
}) {
  const [revPer, setRevPer] = useState('15')
  const [revMcap, setRevMcap] = useState('100')

  const perResult = useMemo(
    () => reversePriceFromPer(fEps, Number(revPer) || 0, input.currentPrice),
    [fEps, revPer, input.currentPrice]
  )
  const mcapResult = useMemo(
    () =>
      reversePriceFromMarketCap(
        isUs,
        Number(revMcap) || 0,
        input.sharesMillion,
        input.currentPrice
      ),
    [isUs, revMcap, input.sharesMillion, input.currentPrice]
  )

  return (
    <div className="toss-card space-y-4">
      <SectionTitle>목표 주가 역산기</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="text-body-2 font-semibold text-muted-foreground">PER → 주가 역산</div>
          <NumberField
            label="목표 PER (배)"
            value={revPer}
            onChange={(e) => setRevPer(e.target.value)}
          />
          {perResult ? (
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-caption text-muted-foreground">
                    예상 EPS × {Number(revPer).toFixed(1)}배
                  </div>
                  <div className="text-title-3 font-bold tabular-nums text-foreground">
                    {fmtPrice(perResult.price, isUs)}
                  </div>
                </div>
                <div className={cn('text-body-1 font-bold', upColor(perResult.upside))}>
                  {fmtPct(perResult.upside)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">EPS 데이터가 필요합니다.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-body-2 font-semibold text-muted-foreground">
            시가총액 → 주가 역산
          </div>
          <NumberField
            label={isUs ? '목표 시가총액 ($B)' : '목표 시가총액 (조원)'}
            value={revMcap}
            onChange={(e) => setRevMcap(e.target.value)}
          />
          {mcapResult ? (
            <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-caption text-muted-foreground">
                    {Number(revMcap).toFixed(0)}
                    {isUs ? '$B' : '조'} ÷ {formatNumber(input.sharesMillion, 1)}M주
                  </div>
                  <div className="text-title-3 font-bold tabular-nums text-foreground">
                    {fmtPrice(mcapResult.price, isUs)}
                  </div>
                </div>
                <div className={cn('text-body-1 font-bold', upColor(mcapResult.upside))}>
                  {fmtPct(mcapResult.upside)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">발행주식수 데이터가 필요합니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** 투자 시나리오 분석 (v5: app.py:7786-7843) */
function Scenario({
  input,
  fairAvg,
  isUs,
}: {
  input: ForwardValuationInput
  fairAvg: number | null
  isUs: boolean
}) {
  const [investAmount, setInvestAmount] = useState(isUs ? '10000' : '1000')
  const [targetSell, setTargetSell] = useState(
    fairAvg ? String(Math.round(fairAvg)) : isUs ? '200' : '100000'
  )

  const result = useMemo(
    () =>
      calcInvestScenario({
        isUs,
        investAmount: Number(investAmount) || 0,
        currentPrice: input.currentPrice,
        targetSell: Number(targetSell) || 0,
        investYears: input.investYears,
      }),
    [isUs, investAmount, targetSell, input.currentPrice, input.investYears]
  )

  return (
    <div className="toss-card space-y-4">
      <SectionTitle>투자 시나리오 분석</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label={isUs ? '투자금액 ($)' : '투자금액 (만원)'}
          value={investAmount}
          onChange={(e) => setInvestAmount(e.target.value)}
        />
        <NumberField
          label={isUs ? '목표 매도가 ($)' : '목표 매도가 (원)'}
          value={targetSell}
          onChange={(e) => setTargetSell(e.target.value)}
        />
      </div>

      {result ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="매수 가능 수량"
            value={`${formatNumber(result.sharesBuy, 1)}주`}
            sub={`단가 ${fmtPrice(input.currentPrice, isUs)}`}
          />
          <StatCard
            label="목표가 평가금"
            value={fmtPrice(result.finalValue, isUs)}
            sub={`목표가 ${fmtPrice(Number(targetSell) || 0, isUs)}`}
          />
          <StatCard
            label="예상 수익금"
            value={fmtPrice(result.profit, isUs)}
            sub={fmtPct(result.profitPct)}
            valueClassName={upColor(result.profitPct)}
          />
          <StatCard
            label="연환산 수익률"
            value={fmtPct(result.annualReturn)}
            sub={`${input.investYears}년 보유 기준`}
            valueClassName={upColor(result.annualReturn)}
          />
        </div>
      ) : (
        <p className="text-caption text-muted-foreground">
          투자금액·현재가·목표 매도가를 입력하세요.
        </p>
      )}
    </div>
  )
}
