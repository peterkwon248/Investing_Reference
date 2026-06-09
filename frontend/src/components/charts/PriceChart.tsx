import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { cn, formatUSD } from '@/lib/utils'

interface PriceChartProps {
  data: Array<{ date: string; close: number }>
  height?: number
  showGrid?: boolean
  className?: string
  color?: 'profit' | 'loss' | 'primary'
}

export function PriceChart({
  data,
  height = 300,
  showGrid = true,
  className,
  color = 'primary',
}: PriceChartProps) {
  const chartColor = useMemo(() => {
    if (color === 'profit') return { stroke: 'var(--profit)', fill: 'var(--profit)' }
    if (color === 'loss') return { stroke: 'var(--loss)', fill: 'var(--loss)' }
    return { stroke: 'var(--primary)', fill: 'var(--primary)' }
  }, [color])

  const isPositive = useMemo(() => {
    if (data.length < 2) return true
    return data[data.length - 1].close >= data[0].close
  }, [data])

  const autoColor = color === 'primary'
    ? isPositive
      ? { stroke: 'var(--profit)', fill: 'var(--profit)' }
      : { stroke: 'var(--loss)', fill: 'var(--loss)' }
    : chartColor

  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-secondary', className)} style={{ height }}>
        <p className="text-body-2 text-muted-foreground">데이터 없음</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={autoColor.fill} stopOpacity={0.2} />
              <stop offset="100%" stopColor={autoColor.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v) => v.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            domain={['auto', 'auto']}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '13px',
            }}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
            formatter={(value: number) => [formatUSD(value), '종가']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={autoColor.stroke}
            strokeWidth={2}
            fill="url(#priceGradient)"
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
