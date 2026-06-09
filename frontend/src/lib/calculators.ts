/**
 * calculators.ts
 *
 * Pure TypeScript math for the 5 calculators ported faithfully from the
 * v5 Streamlit app (투자만능계산기_v5/app.py).
 *
 * Each function block documents its v5 source `def` name and line range.
 * No I/O, no React — just math. `exRate` always means USD/KRW (원/달러).
 */

/* ============================================================================
 * Shared helpers — ported from fv_safe_div / fv_calc_change (app.py:4787-4815)
 * ========================================================================== */

/** 안전한 나눗셈. b가 0/null이거나 a가 null이면 null. (v5: fv_safe_div) */
export function safeDiv(a: number | null, b: number | null): number | null {
  if (b === null || b === 0 || a === null) return null
  return a / b
}

/** 변화율(%) = (forward - current) / |current| * 100. (v5: fv_calc_change) */
export function calcChange(current: number | null, forward: number | null): number | null {
  if (current === null || forward === null || current === 0) return null
  return ((forward - current) / Math.abs(current)) * 100
}

/* ============================================================================
 * 1) 포워드 가치투자 (Forward Valuation)
 *    v5 source: render_forward_valuation  (app.py:6249, math at 7305-7370)
 *
 *    Faithful port of ONLY the portable valuation math: financial statement
 *    inputs (current + forecast) → per-share metrics → multiples → fair value.
 *    The v5 data-loading (DART/yfinance/Naver consensus crawling) is NOT
 *    portable to the browser and is intentionally omitted; the user enters
 *    the financial figures directly, exactly like the v5 manual-input path.
 *
 *    Unit convention (v5): for US (`isUs`) figures are in 백만$ (millions USD)
 *    and DPS/price in $. For KR they are in 억원 (0.1B KRW) and DPS/price in 원.
 *    unit_mult = 1e6 (US) or 1e8 (KR) converts statement units → raw currency.
 * ========================================================================== */

export interface ForwardValuationInput {
  /** true=미국(백만$, $), false=한국(억원, 원) */
  isUs: boolean
  /** 현재가 ($ 또는 원) */
  currentPrice: number
  /** 발행주식수 (백만 주) */
  sharesMillion: number

  // 현재 실적 (단위: 백만$ 또는 억원)
  cRevenue: number
  cOp: number
  cNet: number
  cNetCtrl: number
  cAssets: number
  cLiab: number
  cEquity: number
  cEquityCtrl: number
  /** 현재 DPS ($ 또는 원) */
  cDps: number

  // 예상 실적 (단위: 백만$ 또는 억원)
  fRevenue: number
  fOp: number
  fNet: number
  fNetCtrl: number
  fAssets: number
  fLiab: number
  fEquity: number
  fEquityCtrl: number
  /** 예상 DPS ($ 또는 원) */
  fDps: number

  // 목표 배수 & 기간
  targetPer: number
  targetPbr: number
  targetPsr: number
  investYears: number
}

export interface ForwardValuationResult {
  marketCap: number // raw currency
  // 주당 지표 (per share, raw currency)
  cEps: number | null
  fEps: number | null
  cBps: number | null
  fBps: number | null
  // 밸류에이션 배수
  cPer: number | null
  fPer: number | null
  cPbr: number | null
  fPbr: number | null
  cPsr: number | null
  fPsr: number | null
  // 수익성 (%)
  cOpMargin: number | null
  fOpMargin: number | null
  cNetMargin: number | null
  fNetMargin: number | null
  cRoe: number | null
  fRoe: number | null
  cRoa: number | null
  fRoa: number | null
  // 안정성 & 배당 (%)
  cDebtRatio: number | null
  fDebtRatio: number | null
  cDivYield: number | null
  fDivYield: number | null
  // 적정주가 (per share, raw currency)
  fairPer: number | null
  fairPbr: number | null
  fairPsr: number | null
  fairAvg: number | null
  // 상승여력 (%)
  upsidePer: number | null
  upsidePbr: number | null
  upsidePsr: number | null
  upsideAvg: number | null
  // 할인율 분석
  discount: number | null // (fairAvg - price) / fairAvg * 100
  verdict: string | null
  insight: string | null
}

/** 포워드 가치투자 계산. (v5: render_forward_valuation, app.py:7305-7370 + 7607-7658) */
export function calcForwardValuation(input: ForwardValuationInput): ForwardValuationResult {
  const { isUs, currentPrice } = input

  const sharesCount = input.sharesMillion * 1e6
  const unitMult = isUs ? 1e6 : 1e8
  const marketCap = currentPrice * input.sharesMillion * 1e6

  // 원 단위(raw) 환산
  const cRevenueRaw = input.cRevenue * unitMult
  const cOpRaw = input.cOp * unitMult
  const cNetRaw = input.cNet * unitMult
  const cNetCtrlRaw = input.cNetCtrl * unitMult
  const cAssetsRaw = input.cAssets * unitMult
  const cLiabRaw = input.cLiab * unitMult
  const cEqRaw = input.cEquity * unitMult
  const cEqCtrlRaw = input.cEquityCtrl * unitMult

  const fRevenueRaw = input.fRevenue * unitMult
  const fOpRaw = input.fOp * unitMult
  const fNetRaw = input.fNet * unitMult
  const fNetCtrlRaw = input.fNetCtrl * unitMult
  const fAssetsRaw = input.fAssets * unitMult
  const fLiabRaw = input.fLiab * unitMult
  const fEqRaw = input.fEquity * unitMult
  const fEqCtrlRaw = input.fEquityCtrl * unitMult

  // 주당 지표
  const cEps = safeDiv(cNetCtrlRaw, sharesCount)
  const fEps = safeDiv(fNetCtrlRaw, sharesCount)
  const cBps = safeDiv(cEqCtrlRaw, sharesCount)
  const fBps = safeDiv(fEqCtrlRaw, sharesCount)

  // 밸류에이션
  const cPer = safeDiv(currentPrice, cEps)
  const fPer = safeDiv(currentPrice, fEps)
  const cPbr = safeDiv(currentPrice, cBps)
  const fPbr = safeDiv(currentPrice, fBps)
  const cPsr = safeDiv(marketCap, cRevenueRaw)
  const fPsr = safeDiv(marketCap, fRevenueRaw)

  // 수익성
  const cOpMargin = cRevenueRaw ? (safeDiv(cOpRaw, cRevenueRaw) ?? 0) * 100 : null
  const fOpMargin = fRevenueRaw ? (safeDiv(fOpRaw, fRevenueRaw) ?? 0) * 100 : null
  const cNetMargin = cRevenueRaw ? (safeDiv(cNetRaw, cRevenueRaw) ?? 0) * 100 : null
  const fNetMargin = fRevenueRaw ? (safeDiv(fNetRaw, fRevenueRaw) ?? 0) * 100 : null
  const cRoe = cEqCtrlRaw ? (safeDiv(cNetCtrlRaw, cEqCtrlRaw) ?? 0) * 100 : null
  const fRoe = fEqCtrlRaw ? (safeDiv(fNetCtrlRaw, fEqCtrlRaw) ?? 0) * 100 : null
  const cRoa = cAssetsRaw ? (safeDiv(cNetRaw, cAssetsRaw) ?? 0) * 100 : null
  const fRoa = fAssetsRaw ? (safeDiv(fNetRaw, fAssetsRaw) ?? 0) * 100 : null

  // 안정성
  const cDebtRatio = cEqRaw ? (safeDiv(cLiabRaw, cEqRaw) ?? 0) * 100 : null
  const fDebtRatio = fEqRaw ? (safeDiv(fLiabRaw, fEqRaw) ?? 0) * 100 : null
  const cDivYield = currentPrice ? (safeDiv(input.cDps, currentPrice) ?? 0) * 100 : null
  const fDivYield = currentPrice ? (safeDiv(input.fDps, currentPrice) ?? 0) * 100 : null

  // 적정가
  const fairPer = fEps ? fEps * input.targetPer : null
  const fairPbr = fBps ? fBps * input.targetPbr : null
  const fairPsr =
    fRevenueRaw && sharesCount ? (fRevenueRaw * input.targetPsr) / sharesCount : null

  const fairs = [fairPer, fairPbr, fairPsr].filter(
    (p): p is number => p !== null && p !== 0
  )
  const fairAvg = fairs.length ? fairs.reduce((a, b) => a + b, 0) / fairs.length : null

  const upsidePer = calcChange(currentPrice, fairPer)
  const upsidePbr = calcChange(currentPrice, fairPbr)
  const upsidePsr = calcChange(currentPrice, fairPsr)
  const upsideAvg = calcChange(currentPrice, fairAvg)

  // 할인율 & 투자 판단 (v5: app.py:7608-7647)
  let discount: number | null = null
  let verdict: string | null = null
  let insight: string | null = null
  if (fairAvg && currentPrice > 0) {
    discount = ((fairAvg - currentPrice) / fairAvg) * 100
    if (discount >= 30) {
      verdict = '매우 저평가'
      insight = `현재가가 적정주가 대비 ${Math.abs(discount).toFixed(1)}% 할인되어 있습니다. 장기 투자 관점에서 매우 매력적입니다.`
    } else if (discount >= 10) {
      verdict = '저평가'
      insight = `현재가가 적정주가 대비 ${Math.abs(discount).toFixed(1)}% 할인되어 있습니다. 분할 매수를 고려해볼 만합니다.`
    } else if (discount >= -10) {
      verdict = '적정가'
      insight = '현재가가 적정주가 부근입니다. 추가 조정 시 매수를 고려하세요.'
    } else if (discount >= -30) {
      verdict = '고평가'
      insight = `현재가가 적정주가 대비 ${Math.abs(discount).toFixed(1)}% 고평가되어 있습니다. 신중한 접근이 필요합니다.`
    } else {
      verdict = '매우 고평가'
      insight = `현재가가 적정주가 대비 ${Math.abs(discount).toFixed(1)}% 고평가되어 있습니다. 비중 축소를 고려하세요.`
    }
  }

  return {
    marketCap,
    cEps,
    fEps,
    cBps,
    fBps,
    cPer,
    fPer,
    cPbr,
    fPbr,
    cPsr,
    fPsr,
    cOpMargin,
    fOpMargin,
    cNetMargin,
    fNetMargin,
    cRoe,
    fRoe,
    cRoa,
    fRoa,
    cDebtRatio,
    fDebtRatio,
    cDivYield,
    fDivYield,
    fairPer,
    fairPbr,
    fairPsr,
    fairAvg,
    upsidePer,
    upsidePbr,
    upsidePsr,
    upsideAvg,
    discount,
    verdict,
    insight,
  }
}

/** 투자 시나리오 계산. (v5: render_forward_valuation, app.py:7801-7807) */
export interface InvestScenarioInput {
  isUs: boolean
  /** 투자금액: 미국=$, 한국=만원 */
  investAmount: number
  currentPrice: number
  /** 목표 매도가 ($ 또는 원) */
  targetSell: number
  investYears: number
}

export interface InvestScenarioResult {
  investRaw: number // raw currency
  sharesBuy: number
  finalValue: number
  profit: number
  profitPct: number
  annualReturn: number
}

export function calcInvestScenario(input: InvestScenarioInput): InvestScenarioResult | null {
  const { isUs, investAmount, currentPrice, targetSell, investYears } = input
  if (!(investAmount > 0 && currentPrice > 0 && targetSell > 0)) return null

  const investRaw = isUs ? investAmount : investAmount * 10000 // 만원 → 원
  const sharesBuy = investRaw / currentPrice
  const finalValue = sharesBuy * targetSell
  const profit = finalValue - investRaw
  const profitPct = (profit / investRaw) * 100
  const annualReturn =
    investYears > 0
      ? (Math.pow(1 + profitPct / 100, 1 / investYears) - 1) * 100
      : profitPct

  return { investRaw, sharesBuy, finalValue, profit, profitPct, annualReturn }
}

/** 목표주가 역산: PER 기반. 주가 = 예상EPS × PER. (v5: app.py:7672-7675) */
export function reversePriceFromPer(
  fEps: number | null,
  targetPer: number,
  currentPrice: number
): { price: number; upside: number } | null {
  if (!(fEps && fEps > 0)) return null
  const price = fEps * targetPer
  const upside = currentPrice > 0 ? (price / currentPrice - 1) * 100 : 0
  return { price, upside }
}

/**
 * 목표주가 역산: 시가총액 기반. 주가 = 시가총액 / 발행주식수.
 * (v5: app.py:7697-7708)  mcapInput 단위: 미국=$B, 한국=조원.
 */
export function reversePriceFromMarketCap(
  isUs: boolean,
  mcapInput: number,
  sharesMillion: number,
  currentPrice: number
): { price: number; upside: number } | null {
  const mcapValue = isUs ? mcapInput * 1e9 : mcapInput * 1e12
  const sharesCount = sharesMillion ? sharesMillion * 1e6 : 0
  if (!(sharesCount > 0)) return null
  const price = mcapValue / sharesCount
  const upside = currentPrice > 0 ? (price / currentPrice - 1) * 100 : 0
  return { price, upside }
}

/* ============================================================================
 * 2) 영혼법 계산기 (Soul Method)
 *    v5 source: render_soul_calculator  (app.py:41325)
 *
 *    Strategy: when cash is depleted and a position is deeply underwater,
 *    run small "mini cycles" elsewhere and use each cycle's profit to liquidate
 *    a slice of the losing ("soul") position until the loss is recovered.
 *    All amounts in $.
 * ========================================================================== */

export interface SoulInput {
  /** 보유 수량 (주) */
  shares: number
  /** 평균 매수가 ($) */
  avgPrice: number
  /** 현재가 ($) */
  currentPrice: number
  /** 미니 사이클 원금 ($) */
  miniCapital: number
  /** 분할 횟수 */
  miniDivisions: number
  /** 목표 수익률 (%) */
  miniTarget: number
}

export interface SoulPositionStats {
  invested: number
  marketValue: number
  loss: number // 음수면 손실
  lossPct: number
  expectedProfitPerCycle: number
  dailyBuy: number
}

export interface SoulSimResult {
  recovered: boolean // 손실 완전 복구 여부
  inProfit: boolean // 이미 수익 상태(시뮬 불필요)
  cycleCount: number
  daysEstimate: number
  monthsEstimate: number
  totalSharesSold: number
  remainingShares: number
}

/** 영혼 물량 손익 + 미니 사이클 기본 지표. (v5: app.py:41368-41438) */
export function calcSoulStats(input: SoulInput): SoulPositionStats {
  const invested = input.shares * input.avgPrice
  const marketValue = input.shares * input.currentPrice
  const loss = marketValue - invested
  const lossPct = invested > 0 ? (loss / invested) * 100 : 0
  const expectedProfitPerCycle = input.miniCapital * (input.miniTarget / 100)
  const dailyBuy = input.miniDivisions > 0 ? input.miniCapital / input.miniDivisions : 0
  return { invested, marketValue, loss, lossPct, expectedProfitPerCycle, dailyBuy }
}

/** 영혼법 복구 시뮬레이션. (v5: app.py:41443-41464) */
export function simulateSoul(input: SoulInput): SoulSimResult {
  const stats = calcSoulStats(input)

  if (stats.loss >= 0) {
    // 이미 수익 상태 → 영혼법 불필요
    return {
      recovered: true,
      inProfit: true,
      cycleCount: 0,
      daysEstimate: 0,
      monthsEstimate: 0,
      totalSharesSold: 0,
      remainingShares: input.shares,
    }
  }

  let remainingLoss = Math.abs(stats.loss)
  let cycleCount = 0
  let totalSharesSold = 0

  while (remainingLoss > 0 && cycleCount < 200) {
    cycleCount += 1
    const profit = stats.expectedProfitPerCycle
    const sharesToSell = input.currentPrice > 0 ? profit / input.currentPrice : 0
    const actualSharesSold = Math.min(sharesToSell, input.shares - totalSharesSold)
    const actualProfitUsed = actualSharesSold * input.currentPrice
    remainingLoss -= actualProfitUsed
    totalSharesSold += actualSharesSold

    if (totalSharesSold >= input.shares) break
  }

  const daysEstimate = cycleCount * input.miniDivisions
  const monthsEstimate = daysEstimate / 22

  return {
    recovered: remainingLoss <= 0,
    inProfit: false,
    cycleCount,
    daysEstimate,
    monthsEstimate,
    totalSharesSold,
    remainingShares: input.shares - totalSharesSold,
  }
}

/* ============================================================================
 * 3) 옵션 손익 시뮬레이터 (Option P&L)
 *    v5 source: render_options_calculator → 수익 계산기 tab (app.py:42282-42417)
 *
 *    Faithful port of the option payoff math. The v5 option-chain / IV / PCR /
 *    Max-Pain analytics require live yfinance options data (not available in the
 *    browser) and are intentionally omitted. 1 contract = 100 shares.
 * ========================================================================== */

export type OptionStrategy = 'long_call' | 'long_put' | 'short_call' | 'short_put'

export interface OptionPnlInput {
  strategy: OptionStrategy
  /** 행사가 ($) */
  strike: number
  /** 프리미엄 ($/주) */
  premium: number
  /** 계약 수 */
  contracts: number
  /** 현재 기초자산가 ($) — 그래프 범위/현재 손익용 */
  currentPrice: number
}

export interface OptionPnlPoint {
  price: number
  pnl: number
}

export interface OptionPnlResult {
  totalCost: number // 프리미엄 × 100 × 계약수
  breakeven: number
  /** 숫자면 한정, null이면 "무제한" */
  maxLoss: number | null
  maxGain: number | null
  /** 만기 시 주가별 손익 곡선 (현재가 ±30%, 100포인트) */
  curve: OptionPnlPoint[]
}

/** 단일 만기 손익. (v5 payoff 식, app.py:42306-42325) */
function optionPayoffAt(
  strategy: OptionStrategy,
  priceAtExpiry: number,
  strike: number,
  premium: number,
  contracts: number
): number {
  const mult = 100 * contracts
  switch (strategy) {
    case 'long_call':
      return (Math.max(priceAtExpiry - strike, 0) - premium) * mult
    case 'long_put':
      return (Math.max(strike - priceAtExpiry, 0) - premium) * mult
    case 'short_call':
      return (premium - Math.max(priceAtExpiry - strike, 0)) * mult
    case 'short_put':
      return (premium - Math.max(strike - priceAtExpiry, 0)) * mult
  }
}

/** 옵션 손익 시뮬레이터. (v5: render_options_calculator, app.py:42282-42417) */
export function calcOptionPnl(input: OptionPnlInput): OptionPnlResult {
  const { strategy, strike, premium, contracts, currentPrice } = input
  const totalCost = premium * 100 * contracts

  let breakeven: number
  let maxLoss: number | null
  let maxGain: number | null

  // v5: 콜=strike+premium, 풋=strike-premium 손익분기. 최대손익은 전략별.
  switch (strategy) {
    case 'long_call':
      breakeven = strike + premium
      maxLoss = totalCost
      maxGain = null // 무제한
      break
    case 'long_put':
      breakeven = strike - premium
      maxLoss = totalCost
      maxGain = strike * 100 * contracts - totalCost
      break
    case 'short_call':
      breakeven = strike + premium
      maxLoss = null // 무제한
      maxGain = totalCost
      break
    case 'short_put':
      breakeven = strike - premium
      maxLoss = strike * 100 * contracts - totalCost
      maxGain = totalCost
      break
  }

  // 손익 곡선: np.linspace(price*0.7, price*1.3, 100) (v5: app.py:42303)
  const lo = currentPrice * 0.7
  const hi = currentPrice * 1.3
  const n = 100
  const curve: OptionPnlPoint[] = []
  for (let i = 0; i < n; i++) {
    const price = lo + ((hi - lo) * i) / (n - 1)
    curve.push({ price, pnl: optionPayoffAt(strategy, price, strike, premium, contracts) })
  }

  return { totalCost, breakeven, maxLoss, maxGain, curve }
}

/* ============================================================================
 * 4) 세금 계산기 (Tax)
 *    v5 source: render_tax_calculator  (app.py:38344)
 *      - 양도소득세: app.py:38406-38425
 *      - 배당소득세: app.py:38514-38519
 * ========================================================================== */

/** 해외주식 양도소득세 상수 (v5) */
export const TAX_BASIC_DEDUCTION = 2_500_000 // 기본공제 연 250만원
export const TAX_RATE = 0.22 // 22% (양도세 20% + 지방세 2%)
export const DIV_WITHHOLDING_RATE = 0.15 // 미국 원천징수 15%
export const COMPREHENSIVE_TAX_THRESHOLD = 20_000_000 // 금융소득 종합과세 2,000만원

export interface CapitalGainsTrade {
  /** 매도 금액 ($) */
  sellUsd: number
  /** 매수 금액 ($) */
  buyUsd: number
  /** 매도 시 환율 */
  sellRate: number
  /** 매수 시 환율 */
  buyRate: number
}

export interface CapitalGainsTaxResult {
  totalProfitKrw: number // 손익통산 반영 후 총 양도차익(원)
  taxableIncome: number // 과세 대상(원)
  tax: number // 납부 세금(원)
  netProfit: number // 실수령액(원)
}

/** 해외주식 양도소득세. (v5: app.py:38406-38425) */
export function calcCapitalGainsTax(
  trades: CapitalGainsTrade[],
  otherLoss: number
): CapitalGainsTaxResult {
  let totalProfitKrw = 0
  for (const t of trades) {
    const sellKrw = t.sellUsd * t.sellRate
    const buyKrw = t.buyUsd * t.buyRate
    totalProfitKrw += sellKrw - buyKrw
  }
  // 손익 통산
  totalProfitKrw -= otherLoss
  // 기본 공제
  const taxableIncome = Math.max(0, totalProfitKrw - TAX_BASIC_DEDUCTION)
  const tax = taxableIncome * TAX_RATE
  const netProfit = totalProfitKrw - tax
  return { totalProfitKrw, taxableIncome, tax, netProfit }
}

export interface DividendTaxResult {
  dividendKrw: number // 세전 배당금(원)
  usTax: number // 미국 원천징수(원)
  netDividend: number // 실수령 배당금(원)
  totalFinancialIncome: number // 총 금융소득(원)
  isComprehensive: boolean // 금융소득 종합과세 대상 여부
}

/** 해외주식 배당소득세. (v5: app.py:38514-38519) */
export function calcDividendTax(
  divAmountUsd: number,
  divRate: number,
  otherFinancialIncome: number
): DividendTaxResult {
  const dividendKrw = divAmountUsd * divRate
  const usTax = dividendKrw * DIV_WITHHOLDING_RATE
  const netDividend = dividendKrw - usTax
  const totalFinancialIncome = otherFinancialIncome + dividendKrw
  const isComprehensive = totalFinancialIncome > COMPREHENSIVE_TAX_THRESHOLD
  return { dividendKrw, usTax, netDividend, totalFinancialIncome, isComprehensive }
}

/* ============================================================================
 * 5) 환전 타이밍 (Exchange Timing)
 *    v5 source: render_exchange_timing  (app.py:38605)
 *      - 환전 계산기: app.py:38895-38915
 *      - 룰 기반 진단: app.py:38751-38834 (operates on historical-rate stats)
 *
 *    The historical-rate chart needs yfinance KRW=X data (not in browser), so
 *    the rule-based diagnosis is exposed as a pure function taking stats the
 *    caller supplies (or omitted in UI). The currency converter is fully ported.
 * ========================================================================== */

export type ExchangeDirection = 'krw_to_usd' | 'usd_to_krw'

/** 환전 계산기. (v5: app.py:38899-38915) */
export function convertCurrency(
  direction: ExchangeDirection,
  amount: number,
  exRate: number
): number {
  if (direction === 'krw_to_usd') return exRate ? amount / exRate : 0 // 원 → $
  return amount * exRate // $ → 원
}

export interface ExchangeStats {
  currentRate: number
  avgRate: number
  minRate: number
  maxRate: number
  stdRate: number
  /** 최근 20일 추세(%) */
  trend: number
  /** 기간 내 백분위(0~100) */
  percentile: number
}

export interface ExchangeDiagnosis {
  icon: string
  title: string
  why: string
  how: string
  /** 'up'=상방/약세(빨강), 'down'=하방/강세(파랑), 'neutral' */
  tone: 'up' | 'down' | 'neutral'
  action: string | null
}

/**
 * 룰 기반 환전 타이밍 진단. (v5: app.py:38755-38834)
 * tone은 한국 색 관습(빨강=환율↑/원화약세, 파랑=환율↓/원화강세)에 맞춰 매핑.
 */
export function diagnoseExchangeTiming(stats: ExchangeStats): ExchangeDiagnosis[] {
  const { currentRate, avgRate, minRate, maxRate, stdRate, trend, percentile } = stats
  const out: ExchangeDiagnosis[] = []

  // 1. 평균 대비
  if (currentRate > avgRate * 1.03) {
    out.push({
      icon: '🔴',
      title: `현재 환율이 평균보다 높음 (+${((currentRate / avgRate - 1) * 100).toFixed(1)}%)`,
      why: '현재 환율이 기간 평균보다 3% 이상 높습니다. 원화 가치가 약세입니다.',
      how: '달러 매수(환전)는 보류, 달러 매도(원화 환전)는 유리한 시점',
      tone: 'up',
      action: '환전 보류',
    })
  } else if (currentRate < avgRate * 0.97) {
    out.push({
      icon: '🟢',
      title: `현재 환율이 평균보다 낮음 (${((currentRate / avgRate - 1) * 100).toFixed(1)}%)`,
      why: '현재 환율이 기간 평균보다 3% 이상 낮습니다. 원화 가치가 강세입니다.',
      how: '달러 매수(환전)에 유리한 시점, 분할 환전 추천',
      tone: 'down',
      action: '환전 적기',
    })
  } else {
    out.push({
      icon: '🟡',
      title: '현재 환율이 평균 근처',
      why: `현재 환율이 기간 평균(₩${Math.round(avgRate).toLocaleString('ko-KR')}) 근처입니다.`,
      how: '급하지 않다면 더 낮은 환율을 기다려도 좋음',
      tone: 'neutral',
      action: '대기',
    })
  }

  // 2. 추세
  if (trend > 2) {
    out.push({
      icon: '📈',
      title: `상승 추세 (+${trend.toFixed(1)}%)`,
      why: '최근 20일간 환율이 상승 추세입니다. 달러 강세가 지속되고 있습니다.',
      how: '추가 상승 전 조기 환전 고려',
      tone: 'up',
      action: null,
    })
  } else if (trend < -2) {
    out.push({
      icon: '📉',
      title: `하락 추세 (${trend.toFixed(1)}%)`,
      why: '최근 20일간 환율이 하락 추세입니다. 원화 강세가 지속되고 있습니다.',
      how: '추가 하락 가능성 있으므로 분할 환전 권장',
      tone: 'down',
      action: null,
    })
  }

  // 3. 변동성
  const volatility = (stdRate / avgRate) * 100
  if (volatility > 3) {
    out.push({
      icon: '⚡',
      title: `높은 변동성 (±${volatility.toFixed(1)}%)`,
      why: '환율 변동성이 높습니다. 급격한 변동 가능성이 있습니다.',
      how: '한 번에 큰 금액 환전보다 분할 환전 추천',
      tone: 'neutral',
      action: null,
    })
  }

  // 4. 백분위
  if (percentile > 80) {
    out.push({
      icon: '🔝',
      title: `고점 근처 (상위 ${(100 - percentile).toFixed(0)}%)`,
      why: `현재 환율은 기간 내 상위 ${(100 - percentile).toFixed(0)}% 수준으로, 고점에 가깝습니다.`,
      how: '달러 매수는 불리, 달러 매도는 유리',
      tone: 'up',
      action: null,
    })
  } else if (percentile < 20) {
    out.push({
      icon: '🔻',
      title: `저점 근처 (하위 ${percentile.toFixed(0)}%)`,
      why: `현재 환율은 기간 내 하위 ${percentile.toFixed(0)}% 수준으로, 저점에 가깝습니다.`,
      how: '달러 매수 적기, 적극적 환전 고려',
      tone: 'down',
      action: null,
    })
  }

  // (참조: minRate/maxRate는 호출부 카드 표시에 사용)
  void minRate
  void maxRate
  return out
}
