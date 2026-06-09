import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import {
  calcCapitalGainsTax,
  calcDividendTax,
  TAX_BASIC_DEDUCTION,
  TAX_RATE,
  DIV_WITHHOLDING_RATE,
  COMPREHENSIVE_TAX_THRESHOLD,
  type CapitalGainsTrade,
} from '@/lib/calculators'
import { NumberField, SectionTitle, InfoBox, StatCard } from './components'

const won = (v: number) => `₩${formatNumber(Math.round(v))}`

interface TradeRow {
  sellUsd: string
  buyUsd: string
  sellRate: string
  buyRate: string
}

function emptyRow(rate: number): TradeRow {
  return { sellUsd: '', buyUsd: '', sellRate: String(rate), buyRate: String(rate) }
}

export function TaxTab({ exRate }: { exRate: number }) {
  const [tab, setTab] = useState<'gains' | 'dividend'>('gains')

  return (
    <div className="space-y-5">
      {/* sub-tabs */}
      <div className="flex gap-2">
        <SubTab active={tab === 'gains'} onClick={() => setTab('gains')}>
          양도소득세
        </SubTab>
        <SubTab active={tab === 'dividend'} onClick={() => setTab('dividend')}>
          배당소득세
        </SubTab>
      </div>

      {tab === 'gains' ? <CapitalGains exRate={exRate} /> : <Dividend exRate={exRate} />}
    </div>
  )
}

function SubTab({
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
        'rounded-xl px-4 py-2 text-body-2 font-semibold transition-all',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}

function CapitalGains({ exRate }: { exRate: number }) {
  const [rows, setRows] = useState<TradeRow[]>([emptyRow(exRate)])
  const [otherLoss, setOtherLoss] = useState('0')

  const update = (i: number, key: keyof TradeRow, value: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))

  const result = useMemo(() => {
    const trades: CapitalGainsTrade[] = rows
      .map((r) => ({
        sellUsd: Number(r.sellUsd) || 0,
        buyUsd: Number(r.buyUsd) || 0,
        sellRate: Number(r.sellRate) || exRate,
        buyRate: Number(r.buyRate) || exRate,
      }))
      .filter((t) => t.sellUsd > 0)
    if (trades.length === 0) return null
    return calcCapitalGainsTax(trades, Number(otherLoss) || 0)
  }, [rows, otherLoss, exRate])

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* 입력 */}
      <div className="toss-card space-y-4">
        <SectionTitle>매도 정보 입력</SectionTitle>
        <InfoBox>
          기본 공제 연 250만원 · 세율 22% (양도세 20% + 지방세 2%) · 같은 해 손실과 손익 통산
          가능
        </InfoBox>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-2xl bg-secondary p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-caption font-semibold text-muted-foreground">
                  거래 {i + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground transition-colors hover:text-profit"
                    aria-label="거래 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="매도 금액"
                  suffix="$"
                  value={r.sellUsd}
                  onChange={(e) => update(i, 'sellUsd', e.target.value)}
                  placeholder="0"
                />
                <NumberField
                  label="매수 금액"
                  suffix="$"
                  value={r.buyUsd}
                  onChange={(e) => update(i, 'buyUsd', e.target.value)}
                  placeholder="0"
                />
                <NumberField
                  label="매도 시 환율"
                  value={r.sellRate}
                  onChange={(e) => update(i, 'sellRate', e.target.value)}
                />
                <NumberField
                  label="매수 시 환율"
                  value={r.buyRate}
                  onChange={(e) => update(i, 'buyRate', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setRows((rs) => [...rs, emptyRow(exRate)])}
          className="toss-btn-secondary w-full"
        >
          <Plus className="mr-1 h-4 w-4" /> 거래 추가
        </button>

        <NumberField
          label="올해 확정된 다른 손실 (손익 통산)"
          suffix="₩"
          value={otherLoss}
          onChange={(e) => setOtherLoss(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* 결과 */}
      <div className="toss-card space-y-4">
        <SectionTitle>세금 계산 결과</SectionTitle>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-secondary p-4">
              <div className="text-caption text-muted-foreground">총 양도차익</div>
              <div
                className={cn(
                  'text-title-1 font-extrabold tabular-nums',
                  result.totalProfitKrw >= 0 ? 'text-profit' : 'text-loss'
                )}
              >
                {won(result.totalProfitKrw)}
              </div>
            </div>

            <dl className="space-y-2 text-body-2">
              <Row label="기본 공제" value={`-${won(TAX_BASIC_DEDUCTION)}`} valueClass="text-loss" />
              <Row label="과세 대상" value={won(result.taxableIncome)} />
              <Row label="세율" value={`${(TAX_RATE * 100).toFixed(0)}%`} />
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="납부 세금"
                value={won(result.tax)}
                valueClassName="text-profit"
              />
              <StatCard
                label="실수령액"
                value={won(result.netProfit)}
                valueClassName="text-loss"
              />
            </div>

            {result.taxableIncome > 0 && (
              <InfoBox>
                절세 팁: 손실 종목을 연말 전 매도해 손익 통산 · 250만원 공제 한도를 위해 매년
                분산 매도 · 저환율 매수, 고환율 매도가 원화 차익에 유리
              </InfoBox>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-body-2 text-muted-foreground">
            매도 금액을 입력하면 세금이 자동 계산됩니다.
          </p>
        )}
      </div>
    </div>
  )
}

function Dividend({ exRate }: { exRate: number }) {
  const [divUsd, setDivUsd] = useState('1000')
  const [divRate, setDivRate] = useState(String(exRate))
  const [otherFin, setOtherFin] = useState('0')

  const result = useMemo(
    () => calcDividendTax(Number(divUsd) || 0, Number(divRate) || exRate, Number(otherFin) || 0),
    [divUsd, divRate, otherFin, exRate]
  )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="toss-card space-y-4">
        <SectionTitle>배당 정보 입력</SectionTitle>
        <InfoBox>
          미국 15% 원천징수(현지) → 한미 조세조약으로 추가 과세 없음 · 연간 금융소득 2,000만원
          초과 시 종합과세
        </InfoBox>
        <NumberField
          label="배당금 (세전)"
          suffix="$"
          value={divUsd}
          onChange={(e) => setDivUsd(e.target.value)}
        />
        <NumberField
          label="배당 지급일 환율 (₩/$)"
          value={divRate}
          onChange={(e) => setDivRate(e.target.value)}
        />
        <NumberField
          label="올해 다른 금융소득 (이자+배당)"
          suffix="₩"
          value={otherFin}
          onChange={(e) => setOtherFin(e.target.value)}
        />
      </div>

      <div className="toss-card space-y-4">
        <SectionTitle>배당세 계산 결과</SectionTitle>
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-caption text-muted-foreground">세전 배당금</div>
          <div className="text-title-1 font-extrabold tabular-nums text-foreground">
            {won(result.dividendKrw)}
          </div>
          <div className="text-caption text-muted-foreground">
            ${formatNumber(Number(divUsd) || 0, 2)}
          </div>
        </div>

        <dl className="space-y-2 text-body-2">
          <Row
            label={`미국 원천징수 (${(DIV_WITHHOLDING_RATE * 100).toFixed(0)}%)`}
            value={`-${won(result.usTax)}`}
            valueClass="text-profit"
          />
        </dl>

        <StatCard
          label="실수령 배당금"
          value={won(result.netDividend)}
          valueClassName="text-loss"
        />

        <div
          className={cn(
            'rounded-2xl p-4',
            result.isComprehensive
              ? 'bg-rose-50 dark:bg-rose-500/10'
              : 'bg-emerald-50 dark:bg-emerald-500/10'
          )}
        >
          <div
            className={cn(
              'text-body-2 font-semibold',
              result.isComprehensive
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {result.isComprehensive
              ? '금융소득 종합과세 대상'
              : '금융소득 종합과세 비대상'}
          </div>
          <div className="mt-1 text-caption text-muted-foreground">
            총 금융소득: {won(result.totalFinancialIncome)} / {won(COMPREHENSIVE_TAX_THRESHOLD)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-semibold tabular-nums', valueClass ?? 'text-foreground')}>
        {value}
      </dd>
    </div>
  )
}
