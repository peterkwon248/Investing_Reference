import { type ReactNode, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** 라벨이 붙은 숫자 입력 필드 */
export function NumberField({
  label,
  suffix,
  className,
  ...props
}: {
  label: string
  suffix?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          className="toss-input py-2.5 text-body-2 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-caption text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

/** 결과 통계 카드 (라벨 + 값 + 보조텍스트) */
export function StatCard({
  label,
  value,
  sub,
  valueClassName,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  valueClassName?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl bg-secondary p-4 text-center', className)}>
      <div className="text-caption text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-title-3 font-bold tabular-nums', valueClassName)}>
        {value}
      </div>
      {sub != null && <div className="mt-0.5 text-caption text-muted-foreground">{sub}</div>}
    </div>
  )
}

/** 섹션 제목 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-body-1 font-bold text-foreground">{children}</h3>
}

/** 안내/설명 박스 (정보) */
export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-blue-50 p-4 text-body-2 leading-relaxed text-foreground dark:bg-blue-500/10">
      {children}
    </div>
  )
}

/** 빈 입력 상태 안내 */
export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-body-2 text-muted-foreground">
      {children}
    </div>
  )
}
