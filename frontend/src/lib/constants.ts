export const STRATEGY_NAMES: Record<string, string> = {
  infinite_buy: '무한매수법',
  value_rebalance: '밸류리밸런싱',
  dca: 'DCA (적립식)',
  buy_and_hold: '바이앤홀드',
  lump_sum: '일괄투자',
}

export const PERIOD_OPTIONS = [
  { value: '1mo', label: '1개월' },
  { value: '3mo', label: '3개월' },
  { value: '6mo', label: '6개월' },
  { value: '1y', label: '1년' },
  { value: '2y', label: '2년' },
  { value: '5y', label: '5년' },
  { value: 'max', label: '전체' },
]

export const NAV_ITEMS = [
  { path: '/', label: '홈', icon: 'Home' },
  { path: '/portfolio', label: '포트폴리오', icon: 'Briefcase' },
  { path: '/simulation', label: '시뮬레이션', icon: 'FlaskConical' },
  { path: '/analysis', label: '분석', icon: 'BarChart3' },
  { path: '/market', label: '마켓', icon: 'Globe' },
]
