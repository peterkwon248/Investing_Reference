import { cn, formatPercent } from '@/lib/utils'
import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon?: ReactNode
  className?: string
}

export function MetricCard({ title, value, subtitle, change, icon, className }: MetricCardProps) {
  return (
    <div className={cn('toss-card group', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-body-2 text-muted-foreground">{title}</p>
          <p className="metric-value text-foreground">{value}</p>
          {subtitle && (
            <p className="text-caption text-muted-foreground">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-caption font-semibold',
              change > 0 ? 'bg-profit-subtle text-profit' : change < 0 ? 'bg-loss-subtle text-loss' : 'bg-muted text-muted-foreground'
            )}>
              {formatPercent(change)}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
