import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Calculator, RefreshCw } from 'lucide-react'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { cn, formatNumber } from '@/lib/utils'
import { ForwardValuationTab } from './ForwardValuationTab'
import { SoulTab } from './SoulTab'
import { OptionsTab } from './OptionsTab'
import { TaxTab } from './TaxTab'
import { ExchangeTab } from './ExchangeTab'

const TABS = [
  { value: 'forward', label: '포워드 가치투자' },
  { value: 'soul', label: '영혼법' },
  { value: 'options', label: '옵션' },
  { value: 'tax', label: '세금' },
  { value: 'exchange', label: '환전 타이밍' },
] as const

const DEFAULT_RATE = 1380

export default function CalculatorPage() {
  const { data, isLoading } = useExchangeRate()
  const liveRate = data?.rate

  // 환율 오버라이드: 비어있으면 라이브 환율 사용
  const [override, setOverride] = useState('')
  const exRate = override !== '' ? Number(override) || 0 : liveRate ?? DEFAULT_RATE

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-title-1 font-bold text-foreground">계산기</h1>
            <p className="text-body-2 text-muted-foreground">
              가치투자 · 영혼법 · 옵션 · 세금 · 환전을 한 곳에서
            </p>
          </div>
        </div>

        {/* USD/KRW (표시 + 오버라이드) */}
        <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5">
          <span className="text-caption text-muted-foreground">USD/KRW</span>
          <input
            type="number"
            inputMode="decimal"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder={
              isLoading ? '...' : formatNumber(liveRate ?? DEFAULT_RATE, 2)
            }
            className="w-24 bg-transparent text-right text-body-2 font-semibold tabular-nums text-foreground outline-none [appearance:textfield] placeholder:text-foreground [&::-webkit-inner-spin-button]:appearance-none"
          />
          {override !== '' && (
            <button
              onClick={() => setOverride('')}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="실시간 환율로 복귀"
              title="실시간 환율로 복귀"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="forward" className="space-y-5">
        <Tabs.List className="flex flex-wrap gap-2 rounded-2xl bg-secondary p-1.5">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className={cn(
                'flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-body-2 font-semibold text-muted-foreground transition-all',
                'hover:text-foreground',
                'data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm'
              )}
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="forward" className="focus-visible:outline-none">
          <ForwardValuationTab exRate={exRate} />
        </Tabs.Content>
        <Tabs.Content value="soul" className="focus-visible:outline-none">
          <SoulTab />
        </Tabs.Content>
        <Tabs.Content value="options" className="focus-visible:outline-none">
          <OptionsTab />
        </Tabs.Content>
        <Tabs.Content value="tax" className="focus-visible:outline-none">
          <TaxTab exRate={exRate} />
        </Tabs.Content>
        <Tabs.Content value="exchange" className="focus-visible:outline-none">
          <ExchangeTab exRate={exRate} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
