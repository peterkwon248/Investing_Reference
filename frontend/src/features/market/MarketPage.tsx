import { Globe } from 'lucide-react'

export default function MarketPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-title-1 text-foreground">마켓</h1>
        <p className="text-body-2 text-muted-foreground">글로벌 시장 현황을 한눈에</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="toss-card">
          <h3 className="text-title-3 text-foreground mb-3">히트맵</h3>
          <div className="flex h-48 items-center justify-center rounded-xl bg-secondary">
            <p className="text-body-2 text-muted-foreground">히트맵 준비 중...</p>
          </div>
        </div>
        <div className="toss-card">
          <h3 className="text-title-3 text-foreground mb-3">주요 지수</h3>
          <div className="flex h-48 items-center justify-center rounded-xl bg-secondary">
            <p className="text-body-2 text-muted-foreground">지수 데이터 준비 중...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
