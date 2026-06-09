# 📊 투자만능계산기 v6 — 기능 코드 레퍼런스

> **이 저장소는 "레퍼런스 라이브러리"입니다.**
> 새 앱을 만들 때 여기 있는 **기능별 코드를 찾아 본따 쓰기 위한 목적**으로 정리되었습니다.
> 아래 **기능 → 파일 매핑**에서 원하는 기능을 찾아 해당 파일을 참고하세요.

원본: Streamlit 단일 파일 앱(`투자만능계산기 v5`, 약 48,500줄) → **React + FastAPI 풀스택으로 마이그레이션**한 버전.

---

## 🧱 기술 스택

| 레이어 | 기술 |
|---|---|
| **Frontend** | React 18, Vite 5, TypeScript, TailwindCSS, React Query(@tanstack), Zustand, Axios, React Router 6, Recharts, lightweight-charts, Framer Motion, Radix UI, Lucide |
| **Backend** | FastAPI, SQLAlchemy(async/asyncpg), Pydantic v2, Redis, yfinance, pandas, numpy |
| **Infra** | PostgreSQL 16, Redis 7 (Docker Compose), Nginx |

---

## 🗂️ 디렉터리 구조

```
투자만능계산기_v6/
├── backend/app/
│   ├── core/       # 순수 비즈니스 로직 (백테스트 엔진·지표·대가분석) — DB 의존 없음
│   ├── data/       # 외부 데이터 소스 (yfinance)
│   ├── services/   # 서비스 레이어 (캐싱·DB·분석 오케스트레이션)
│   ├── db/         # SQLAlchemy ORM 모델 + 연결/세션 관리
│   ├── schemas/    # Pydantic 요청/응답 스키마
│   ├── api/v1/     # REST 라우트
│   ├── config.py   # 환경설정 (Pydantic Settings)
│   └── main.py     # FastAPI 앱 팩토리
└── frontend/src/
    ├── features/   # 페이지 모듈 (라우트별)
    ├── hooks/      # React Query 데이터 훅
    ├── stores/     # Zustand 전역 상태
    ├── api/        # Axios API 클라이언트
    ├── components/ # 공유 컴포넌트 + 레이아웃
    ├── lib/        # 유틸 / 상수 / 계산기 로직
    └── types/      # TypeScript 타입
```

---

## 🧪 분석 & 도구 기능 (v5 → v6 풀스택 포팅)

원본 v5(Streamlit)의 5개 기능을 React + FastAPI로 이식. **각 기능의 풀스택 경로(페이지 → 훅/API → 백엔드 → 핵심 로직)**:

| 기능 | 프론트 페이지 | 훅 / API 클라이언트 | 백엔드 서비스 → 엔드포인트 | 핵심 로직 |
|---|---|---|---|---|
| 🏆 **대가분석실** | `features/masters-lab/MastersLabPage.tsx` | `hooks/useAnalysis.ts` / `api/analysis.api.ts` | `analysis_service.py` → `GET /analysis/masters/{ticker}` | `core/masters.py` (5대 대가 스코어링) |
| 🧮 **계산기** | `features/calculator/` (5탭 + 공통컴포넌트) | — *(백엔드 불필요, 순수 프론트)* | — | `lib/calculators.ts` (포워드·영혼법·옵션·세금·환전) |
| 📈 **슈퍼차트** | `features/super-chart/SuperChartPage.tsx` | `hooks/useChart.ts` / `api/chart.api.ts` | `chart_service.py` → `GET /analysis/chart/{ticker}` | `core/indicators.py` (MA·RSI·MACD·BB·지지저항) |
| 💰 **슈퍼배당** | `features/super-dividend/SuperDividendPage.tsx` | `hooks/useDividend.ts` / `api/dividend.api.ts` | `dividend_service.py` → `GET /analysis/dividend/{ticker}` | yfinance 배당 시계열 + 등급/CAGR/DRIP |
| 🌍 **매크로** | `features/macro/MacroPage.tsx` | `hooks/useMacro.ts` / `api/macro.api.ts` | `macro_service.py` → `GET /analysis/macro` | 9지표(VIX·SPY·금·환율 등) 룰 스코어링 |

- **차트**: `lightweight-charts`(슈퍼차트 캔들/MA/RSI/MACD) · `recharts`(슈퍼배당 연도별 막대).
- **백엔드 패턴**: `core/*` 순수 로직 + yfinance 데이터를 `asyncio.to_thread`로 비블로킹 래핑 → REST로 노출. (`analysis_service.py`가 그 원형)
- **타입**: `types/{analysis,chart,dividend,macro}.types.ts`, 스키마 `schemas/{analysis,chart,dividend,macro}.py`.
- 외부 키 필요분(경제캘린더·마켓뉴스·FRED·DART 자동수집·라이브 옵션체인)은 제외하고 계산/분석 핵심만 이식.

---

## 🔑 기능 → 파일 레퍼런스 맵

## 백엔드

### 📈 백테스트 엔진 — `backend/app/core/engine.py`
순수 계산 로직(DB 접근 없음). 일자별 가격 시뮬레이션 + 거래비용(수수료·슬리피지·환전·세금) 모델.

| 전략 | 메서드 | 설명 |
|---|---|---|
| 무한매수 | `run_infinite_buy()` | 자본을 N분할(기본 40), 평단 대비 목표수익(기본 10%) 도달 시 전량매도 후 사이클 반복 |
| DCA(적립식) | `run_dca()` | 정기 간격(기본 21일) 고정액 매수, 초기 일괄 + 주기 조합 가능 |
| 바이앤홀드 | `run_buy_and_hold()` | 초기 자본 일괄 매수 후 보유 (기준선 전략) |
| 밸류 리밸런싱 | `run_value_rebalance()` | 성장 기준선 + 상/하단 밴드(±15%) 돌파 시 매도/매수, 풀 한도로 과매매 방지 |
| 전략 비교 | `compare()` | 복수 전략 실행 후 수익·샤프·MDD·칼마 기준 우수 전략 식별 |

- **비용 모델 / 결과 타입**: `backend/app/core/models.py` — `BacktestConfig`(+프리셋 6종: 무비용·미국·한국·암호화폐 등), `TradeRecord`, `BacktestResult`
- **전략 enum**: `backend/app/core/enums.py` — `StrategyType`
- **♻️ 재사용 포인트**: 전략 = `run_*()` 메서드 하나로 독립 구현 → 새 전략 추가 시 메서드만 추가. 비용은 `BacktestConfig`로 교체.

### 📐 성과지표 — `backend/app/core/metrics.py`
`BacktestMetrics` 정적 메서드 모음: 총수익률, CAGR(252일), MDD·지속기간, 샤프, 소르티노, 칼마, 변동성·하방변동성, 승률·손익비·턴오버, 최대 연속 손익.

### 📊 기술적 지표 — `backend/app/core/indicators.py`
`calc_all_indicators()`(MA·RSI·MACD·ATR·볼린저·거래량MA 등 15종), `find_support_resistance()`(지지/저항 클러스터링), `analyze_all()`(이평 배열·골든/데드크로스·종합 신호 0~100점). pandas 벡터 연산.
> 🔌 **슈퍼차트**(`GET /analysis/chart/{ticker}`)에서 사용 — `chart_service.py`가 이 모듈을 호출.

### 🏆 5대 투자대가 스코어링 — `backend/app/core/masters.py`
버핏·린치·그레이엄·드러켄밀러·코스톨라니 각 0~100점 + 종합. `analyze_all_masters()`. 펀더멘털 + 기술 다각 평가.
> 🔌 **대가분석실**(`GET /analysis/masters/{ticker}`)에서 사용 — `analysis_service.py`가 이 모듈을 호출.

### 💱 포맷터 — `backend/app/core/formatters.py`
`format_krw`(억/만 단위), `format_usd`, `format_dual`(USD+KRW 환산), `format_percent`(±부호).

### 🌐 외부 데이터 — `backend/app/data/yfinance_client.py`
`get_stock_price`, `get_stock_history`(OHLCV), `get_exchange_rate`(USD/KRW), `search_stock`, `get_analysis_data`(info+1년 이력+현재가, 분석용). 예외 시 기본값 폴백.
> 참고: Selenium(네이버 스크래핑)·WebSocket은 `config`·`docker-compose`·`api/ws/`에 **스캐폴딩만** 있고 구현 전 단계.

### ⚡ Redis 캐싱 — `backend/app/services/cache_service.py`
`CacheService`: `get / set / delete / delete_pattern`. `invest_calc:` 네임스페이스 + JSON 직렬화 + per-key TTL. Redis 없으면 graceful degrade.

### 🧩 서비스 레이어 — `backend/app/services/`

| 기능 | 파일 | 핵심 |
|---|---|---|
| 주가 조회(캐시 통합) | `stock_service.py` | yfinance + Redis, TTL 차등(환율 10분 / 시세 2분 / 이력 5분 / 검색 1시간) |
| 포트폴리오 CRUD | `portfolio_service.py` | async ORM, `selectinload`로 N+1 방지, flush/refresh |
| 즐겨찾기 | `favorite_service.py` | 티커 단위 CRUD + 중복 방지 |
| 백테스트 실행 | `backtest_service.py` | 데이터 로딩(async) ↔ 엔진 계산(sync) 분리 |
| 대가분석 | `analysis_service.py` | `masters.py` + yfinance info/hist, `asyncio.to_thread` 비블로킹 |
| 슈퍼차트 | `chart_service.py` | `indicators.py` 재사용, OHLCV 캔들 + 지표 시계열 + 종합진단 |
| 슈퍼배당 | `dividend_service.py` | yfinance 배당 시계열, 배당왕/귀족 등급·CAGR·DRIP |
| 매크로 | `macro_service.py` | 9지표 `asyncio.gather` 동시조회 + 룰 기반 시장 스코어링 |

### 🗄️ DB 레이어 — `backend/app/db/`
- `database.py`: async 엔진/세션 싱글톤, 커넥션 풀링(pool_size=20), `init_db()`(테이블 자동 생성)·`get_redis()`·`close_db()`
- `models.py`: 7개 테이블(`Portfolio` · `Position` · `TradeHistory` · `FundHistory` · `BacktestResultDB` · `Favorite` · `PriceCache`), 전략 파라미터·결과는 JSONB, 복합 인덱스
- **DI**: `backend/app/dependencies.py` — `get_db()`(요청 단위 세션 + 자동 commit/rollback)

### 🔌 API 라우트 — `backend/app/api/v1/`
앱 팩토리 `main.py`(lifespan에서 DB init), 라우터 합성 `router.py`. 전체 `/api/v1` prefix.

| 리소스 | 파일 | 주요 엔드포인트 |
|---|---|---|
| 주식 | `stocks.py` | `GET /stocks/exchange-rate`, `/stocks/search`, `/stocks/{ticker}`, `/stocks/{ticker}/history` |
| 백테스트 | `backtests.py` | `POST /backtests/{infinite-buy,dca,buy-and-hold,value-rebalance,compare}`, `GET /backtests/presets` |
| 포트폴리오 | `portfolios.py` | `GET/POST /portfolios`, `GET/PUT/DELETE /portfolios/{id}`, `positions`·`trades`·`funds` 하위 |
| 즐겨찾기 | `favorites.py` | `GET/POST /favorites`, `DELETE /favorites/{ticker}`, `GET /favorites/{ticker}/check` |
| 대가분석 | `analysis.py` | `GET /analysis/masters/{ticker}` (5대 대가 점수·의견·종합판정) |
| 슈퍼차트 | `chart.py` | `GET /analysis/chart/{ticker}` (캔들 + MA/RSI/MACD 시계열 + 종합진단) |
| 슈퍼배당 | `dividend.py` | `GET /analysis/dividend/{ticker}` (배당수익률·등급·CAGR·DRIP) |
| 매크로 | `macro.py` | `GET /analysis/macro` (9지표 시장진단 + 전략) |
| 스키마 | `schemas/{backtest,portfolio,stock,analysis,chart,dividend,macro}.py` | 요청/응답 Pydantic 모델 |

## 프론트엔드

### 🧭 라우팅 & 레이아웃
- `frontend/src/main.tsx` — BrowserRouter + QueryClientProvider 루트
- `frontend/src/App.tsx` — Routes 정의 (미매칭 경로는 `components/common/ComingSoon.tsx` 404 폴백)
- `frontend/src/components/layout/` — `AppLayout`(Outlet 프레임) · `Sidebar`(접이식 260↔72px) · `Header`(환율·테마 토글)

| 라우트 | 파일 | 비고 |
|---|---|---|
| `/` | `features/home/HomePage.tsx` | 대시보드(환율·즐겨찾기·퀵 액션) |
| `/portfolio` | `features/portfolio/PortfolioPage.tsx` | 포트폴리오 관리(모달·카드·디테일 패널) |
| `/simulation` | `features/simulation/SimulationPage.tsx` | 백테스트 실행 |
| `/analysis` | `features/analysis/AnalysisPage.tsx` | 분석 (기본 스텁) |
| `/market` | `features/market/MarketPage.tsx` | 마켓 (기본 스텁) |
| `/masters-lab` | `features/masters-lab/MastersLabPage.tsx` | 🏆 대가분석실 — 5대 거장 종목 평가 |
| `/calculator` | `features/calculator/CalculatorPage.tsx` | 🧮 계산기 — 포워드·영혼법·옵션·세금·환전 5탭 |
| `/super-chart` | `features/super-chart/SuperChartPage.tsx` | 📈 슈퍼차트 — 캔들 + 기술지표 + 매매진단 |
| `/super-dividend` | `features/super-dividend/SuperDividendPage.tsx` | 💰 슈퍼배당 — 배당 분석·등급·DRIP 예측 |
| `/macro` | `features/macro/MacroPage.tsx` | 🌍 매크로 — 글로벌 9지표 시장진단 |

### 🔄 상태관리 — React Query + Zustand
- **데이터 훅** `frontend/src/hooks/`: `useStockData`(시세·이력·검색), `useExchangeRate`(10분 주기 refetch + 스토어 동기화), `usePortfolio`, `useFavorites`, `useAnalysis`(대가분석), `useChart`(슈퍼차트), `useDividend`(슈퍼배당), `useMacro`(매크로)
- **전역 상태** `frontend/src/stores/`: `useAppStore`(테마·사이드바·환율), `usePortfolioStore`, `useBacktestStore`, `useFavoritesStore`
- **패턴**: 서버 상태 = React Query, UI 상태 = Zustand, 뮤테이션 성공 시 스토어 동기화

### 📡 API 클라이언트 — `frontend/src/api/`
`client.ts`(Axios 인스턴스, `/api/v1` baseURL, 30s 타임아웃, 에러 인터셉터) + 리소스별 모듈: `stocks` · `portfolios` · `favorites` · `backtests` · `analysis` · `chart` · `dividend` · `macro`.

### 🎨 토스증권 스타일 디자인 시스템
- `frontend/tailwind.config.ts` — 토스 컬러 팔레트(라이트/다크), Pretendard 폰트, 커스텀 섀도·애니메이션
- `frontend/src/styles/globals.css` — CSS 변수 + `.toss-card` · `.toss-btn-primary` · `.toss-input` · `.nav-item` 컴포넌트 클래스
- `frontend/src/lib/utils.ts` — `cn()`(clsx+tailwind-merge), `formatKRW/USD/Percent`, `getProfitColor`(🔴수익 · 🔵손실, 한국 관례)
- **♻️ 재사용 포인트**: 색을 전부 CSS 변수로 → 다크모드 토글이 변수 교체만으로 동작
- **⚠️ 주의(레퍼런스 학습거리)**: 색 토큰이 통짜 CSS 변수(`var(--x)`)라 **Tailwind 불투명도 modifier(`bg-primary/10` 등)가 안 먹음.** 반투명이 필요하면 기본 팔레트(`emerald/rose/...`) 또는 `color-mix()`를 사용.

### 🧱 공통 컴포넌트 — `frontend/src/components/`
`data-display/MetricCard`(KPI 카드) · `common/Skeleton`(시머 로딩) · `common/LoadingSpinner` · `common/ErrorBoundary` · `common/ComingSoon`(미구현/404 안내) · `forms/StockSearchInput`(300ms 디바운스 자동완성 + 즐겨찾기 토글) · `charts/PriceChart`(Recharts AreaChart).

### 🔤 타입 — `frontend/src/types/`
`stock` · `portfolio` · `backtest` · `analysis` · `chart` · `dividend` · `macro` `.types.ts` — API 모델 인터페이스.

### 🧮 계산기 로직 — `frontend/src/lib/calculators.ts`
포워드 가치투자(EPS/BPS·PER/PBR/PSR·적정주가), 영혼법(물타기 청산 시뮬), 옵션 P&L, 세금(양도·배당), 환전 타이밍 — **순수 TS 함수**(백엔드 불필요). 각 함수에 v5 원본 위치 JSDoc.

---

## ▶️ 로컬 실행

```bash
# 1) 인프라 (PostgreSQL :5433, Redis :6379)
docker compose up -d db redis

# 2) 백엔드 (FastAPI :8000)
cd backend
python -m uvicorn app.main:app --reload --port 8000
#  └ API 문서: http://localhost:8000/docs

# 3) 프론트엔드 (Vite :5173)
cd frontend
npm install        # 최초 1회
npm run dev
#  └ http://localhost:5173  ( /api → :8000 프록시 )
```

> Claude Code 사용 시: `.claude/launch.json`에 `frontend`·`backend` dev 서버가 정의돼 있어 preview로 바로 실행할 수 있습니다.

---

## ♻️ 재사용 가치 높은 패턴 모음

- **전략 = 메서드 하나** (`engine.py`): 백테스트 전략을 `run_*()`로 독립화 → 확장 쉬움
- **교체 가능한 비용 모델** (`BacktestConfig` 프리셋): 시장/자산별 거래비용 분리
- **캐시 인지 서비스 파사드** (`stock_service`): 외부 API ↔ Redis TTL 캐시 ↔ 비즈니스 로직 3단 분리
- **순수 core 로직 → REST 노출** (`analysis/chart/macro_service`): `core/*` 동기 계산을 `asyncio.to_thread`/`gather`로 감싸 비블로킹 API화
- **async DB + DI** (`dependencies.get_db`): 트랜잭션 자동 commit/rollback, `selectinload` N+1 방지
- **React Query + Zustand 이중화**: 서버 상태/UI 상태 분리, 뮤테이션 → 스토어 동기화
- **CSS 변수 디자인 토큰** (`globals.css`): 라이트/다크 토글을 변수 교체로
- **차트 생명주기 관리** (`SuperChartPage`): `lightweight-charts`를 `useEffect`에서 생성/`remove()` + `ResizeObserver`로 정리

---

*이 README는 코드베이스 스캔으로 작성된 기능 인덱스입니다. 모든 파일 경로는 저장소 루트 기준.*
