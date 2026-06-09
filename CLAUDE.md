# 투자만능계산기 v6 - 마이그레이션 프로젝트

## 개요
- **원본**: `투자만능계산기_v5/app.py` (Streamlit, 48,500줄, 단일 파일)
- **목표**: React+TypeScript + FastAPI + PostgreSQL + Redis
- **디자인**: 토스증권 스타일 (Pretendard 폰트, 블루 포인트, 라운드 카드)

## 아키텍처
```
투자만능계산기_v6/
├── backend/          # FastAPI (Python 3.14)
│   ├── app/
│   │   ├── main.py           # FastAPI 앱 팩토리
│   │   ├── config.py         # Pydantic Settings
│   │   ├── dependencies.py   # DI (DB 세션)
│   │   ├── core/             # 비즈니스 로직 (app.py에서 추출)
│   │   ├── data/             # 데이터 접근 (yfinance, 네이버 등)
│   │   ├── db/               # SQLAlchemy ORM + database.py
│   │   ├── schemas/          # Pydantic 스키마
│   │   ├── services/         # 서비스 레이어
│   │   ├── api/v1/           # REST 라우트
│   │   └── tasks/            # 백그라운드 작업
│   └── .env                  # 환경변수
├── frontend/         # React + Vite + TypeScript
│   └── src/
│       ├── api/              # API 클라이언트 (Axios)
│       ├── stores/           # Zustand 스토어
│       ├── hooks/            # React Query 훅
│       ├── types/            # TypeScript 타입
│       ├── components/       # 공유 컴포넌트
│       ├── features/         # 페이지 모듈
│       └── lib/              # 유틸리티
├── docker-compose.yml
└── nginx/nginx.conf
```

## 인프라
- **PostgreSQL**: Docker, port 5433 (호스트) → 5432 (컨테이너)
  - 주의: port 5432는 n8n-postgres가 사용 중
- **Redis**: Docker, port 6379
- **Python**: `C:\Users\kwonkyunghun\AppData\Local\Python\pythoncore-3.14-64\python.exe`
- **Node**: frontend/ 디렉토리에서 npm

## 서버 시작 방법
```bash
# Docker (PostgreSQL + Redis)
cd 투자만능계산기_v6
docker compose up -d db redis

# 백엔드 (FastAPI)
cd backend
"C:\Users\kwonkyunghun\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 프론트엔드 (Vite)
cd frontend
npm run dev
```

## 주의사항
- **cp949 인코딩**: Windows에서 Python print문에 emoji 사용 금지. `[TAG]` 형식 사용
- **Python 경로**: `py` 명령이 아닌 전체 경로 사용 필요
- **pycache**: 라우트 변경 후 서버가 반영 안 되면 `__pycache__` 삭제 후 재시작
- **DB echo**: debug=true일 때 SQLAlchemy SQL 로그가 많이 출력됨

## 마이그레이션 Phase 현황

### Phase 1: 기반 스캐폴딩 ✅ 완료
- FastAPI 프로젝트 구조 생성
- core/ 모듈 추출 (enums, models, metrics, engine, formatters, indicators, masters)
- 기본 API: /health, /stocks/exchange-rate, /stocks/{ticker}, /stocks/search
- 백테스트 API: infinite-buy, dca, buy-and-hold, value-rebalance, compare, presets
- React+Vite 프로젝트 + Tailwind + 토스증권 디자인 시스템
- 13개 페이지 라우트 + Sidebar + Header + AppLayout

### Phase 2: 포트폴리오 + 데이터 ⚠️ 코드 완료, 서버 검증 필요
**백엔드 (완료):**
- DB 테이블 7개 자동 생성 (portfolios, positions, trade_history, fund_history, backtest_results, favorites, price_cache)
- Redis 캐싱 레이어 (cache_service.py)
- 포트폴리오 CRUD 서비스 + API (10개 엔드포인트)
- 즐겨찾기 서비스 + API (4개 엔드포인트)
- stock_service에 Redis 캐싱 적용

**프론트엔드 (완료):**
- portfolio.types.ts 타입 정의
- portfolios.api.ts, favorites.api.ts API 클라이언트
- usePortfolioStore, useFavoritesStore Zustand 스토어
- usePortfolio, useFavorites React Query 훅
- PortfolioPage 완전 재작성 (모달, 카드, 디테일 패널)
- HomePage 즐겨찾기 실제 API 연동
- StockSearchInput 디바운스 검색 + 즐겨찾기 버튼

**남은 이슈:**
- Uvicorn 서버에서 portfolios/favorites 라우트가 등록 안 되는 문제
- Python 직접 import 시에는 정상 동작 확인됨
- 해결 방법: 모든 Python 프로세스 종료 → __pycache__ 삭제 → 서버 재시작
- TypeScript 빌드는 0 errors 통과

### Phase 3: 백테스팅 엔진 - 미시작
### Phase 4: 실시간 추적 + WebSocket - 미시작
### Phase 5: 분석 + 슈퍼차트 - 미시작
### Phase 6: 배당 + 대가분석 - 미시작
### Phase 7: 마켓 + 계산기 + 매크로 - 미시작
### Phase 8: AI + 마무리 - 미시작
### Phase 9: 테스트 + 배포 - 미시작

## 다음 세션에서 할 일
1. 작업 관리자에서 모든 Python 프로세스 종료
2. backend/__pycache__ 전체 삭제
3. 서버 재시작 후 `GET /api/v1/portfolios` 동작 확인
4. 프론트엔드에서 포트폴리오 생성/조회/삭제 테스트
5. 즐겨찾기 추가/삭제 테스트
6. Phase 2 검증 완료 후 Phase 3 진행

## 파일 수 현황
- Backend: 36개 Python 파일
- Frontend: 34개 TypeScript/TSX 파일
- 총 70+ 파일
