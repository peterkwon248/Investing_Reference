import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import HomePage from './features/home/HomePage'
import PortfolioPage from './features/portfolio/PortfolioPage'
import SimulationPage from './features/simulation/SimulationPage'
import AnalysisPage from './features/analysis/AnalysisPage'
import MarketPage from './features/market/MarketPage'
import MastersLabPage from './features/masters-lab/MastersLabPage'
import CalculatorPage from './features/calculator/CalculatorPage'
import SuperChartPage from './features/super-chart/SuperChartPage'
import SuperDividendPage from './features/super-dividend/SuperDividendPage'
import MacroPage from './features/macro/MacroPage'
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
        <Route path="/masters-lab" element={<MastersLabPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/super-chart" element={<SuperChartPage />} />
        <Route path="/super-dividend" element={<SuperDividendPage />} />
        <Route path="/macro" element={<MacroPage />} />
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
