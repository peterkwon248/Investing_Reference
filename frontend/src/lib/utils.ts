import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKRW(value: number): string {
  if (Math.abs(value) >= 1e8) return `₩${(value / 1e8).toFixed(2)}억`
  if (Math.abs(value) >= 1e4) return `₩${(value / 1e4).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`
  return `₩${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
}

export function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function getProfitColor(value: number): string {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-muted-foreground'
}

export function getProfitBg(value: number): string {
  if (value > 0) return 'bg-profit-subtle'
  if (value < 0) return 'bg-loss-subtle'
  return 'bg-muted'
}
