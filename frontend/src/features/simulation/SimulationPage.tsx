import { useState } from 'react'
import { FlaskConical, Play } from 'lucide-react'

const strategies = [
  { id: 'infinite_buy', name: '무한매수법', desc: '물타기 전략의 체계적 접근', color: 'blue' },
  { id: 'dca', name: 'DCA (적립식)', desc: '정기적 정액 매수', color: 'emerald' },
  { id: 'buy_and_hold', name: '바이앤홀드', desc: '장기 보유 전략', color: 'purple' },
  { id: 'value_rebalance', name: '밸류리밸런싱', desc: '기준선 기반 리밸런싱', color: 'orange' },
]

export default function SimulationPage() {
  const [selected, setSelected] = useState<string>('infinite_buy')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-title-1 text-foreground">시뮬레이션</h1>
        <p className="text-body-2 text-muted-foreground">전략을 과거 데이터로 백테스트하세요</p>
      </div>

      {/* Strategy Selection */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`toss-card cursor-pointer text-left transition-all ${
              selected === s.id
                ? 'ring-2 ring-primary border-primary/30'
                : 'hover:border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${s.color}-500/10`}>
                <FlaskConical className={`h-5 w-5 text-${s.color}-400`} />
              </div>
              <div>
                <p className="text-body-2 font-semibold text-foreground">{s.name}</p>
                <p className="text-caption text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Config Panel */}
      <div className="toss-card space-y-4">
        <h3 className="text-title-3 text-foreground">백테스트 설정</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-body-2 text-muted-foreground">종목</label>
            <input
              type="text"
              placeholder="AAPL"
              className="toss-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-body-2 text-muted-foreground">투자금</label>
            <input
              type="number"
              placeholder="10000"
              className="toss-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-body-2 text-muted-foreground">기간</label>
            <select className="toss-input">
              <option value="1y">1년</option>
              <option value="2y">2년</option>
              <option value="5y">5년</option>
            </select>
          </div>
        </div>
        <button className="toss-btn-primary gap-2">
          <Play className="h-4 w-4" />
          백테스트 실행
        </button>
      </div>
    </div>
  )
}
