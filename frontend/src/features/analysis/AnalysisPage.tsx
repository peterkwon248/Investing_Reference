import { BarChart3 } from 'lucide-react'

export default function AnalysisPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-title-1 text-foreground">분석</h1>
        <p className="text-body-2 text-muted-foreground">종목의 기술적 · 기본적 분석을 수행하세요</p>
      </div>
      <div className="toss-card flex flex-col items-center justify-center py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-title-3 text-foreground mb-1">종목을 검색하세요</h3>
        <p className="text-body-2 text-muted-foreground mb-4">AI 분석, 통합 분석, 비교 도구를 사용할 수 있습니다</p>
        <input
          type="text"
          placeholder="종목명 또는 티커 입력 (예: AAPL)"
          className="toss-input max-w-sm"
        />
      </div>
    </div>
  )
}
