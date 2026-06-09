import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import HomePage from './features/home/HomePage'
import PortfolioPage from './features/portfolio/PortfolioPage'
import SimulationPage from './features/simulation/SimulationPage'
import AnalysisPage from './features/analysis/AnalysisPage'
import MarketPage from './features/market/MarketPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/market" element={<MarketPage />} />
      </Route>
    </Routes>
  )
}
