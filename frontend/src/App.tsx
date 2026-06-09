import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import HomePage from './features/home/HomePage'
import PortfolioPage from './features/portfolio/PortfolioPage'
import SimulationPage from './features/simulation/SimulationPage'
import AnalysisPage from './features/analysis/AnalysisPage'
import MarketPage from './features/market/MarketPage'
import ComingSoon from './components/common/ComingSoon'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/market" element={<MarketPage />} />
        {/* 아직 미구현 기능 (Phase 3~7) — 빈 화면 대신 준비중 안내 */}
        <Route path="/super-chart" element={<ComingSoon title="슈퍼차트" />} />
        <Route path="/super-dividend" element={<ComingSoon title="슈퍼배당" />} />
        <Route path="/masters-lab" element={<ComingSoon title="대가분석실" />} />
        <Route path="/calculator" element={<ComingSoon title="계산기" />} />
        <Route path="/macro" element={<ComingSoon title="매크로" />} />
        {/* 매칭되지 않는 모든 경로 fallback (404) */}
        <Route
          path="*"
          element={
            <ComingSoon
              title="페이지를 찾을 수 없어요"
              description="요청하신 페이지가 없어요. 주소를 확인해 주세요."
            />
          }
        />
      </Route>
    </Routes>
  )
}
