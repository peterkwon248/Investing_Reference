import asyncio
from typing import Optional, Dict

from app.data.yfinance_client import get_analysis_data
from app.core.masters import analyze_all_masters

# 거장 표시 순서
MASTER_ORDER = ["buffett", "lynch", "graham", "druckenmiller", "kostolany"]


class AnalysisService:
    """종목 분석 서비스 (5대 대가 스코어링)."""

    async def get_masters_analysis(self, ticker: str) -> Optional[Dict]:
        ticker = ticker.upper().strip()

        # yfinance 호출 + pandas 계산은 블로킹 → 스레드로 오프로드
        data = await asyncio.to_thread(get_analysis_data, ticker)
        if not data:
            return None

        result = await asyncio.to_thread(
            analyze_all_masters,
            ticker,
            data["info"],
            data["hist"],
            data["current_price"],
        )
        return self._format(result, data["info"])

    @staticmethod
    def _verdict(score: int) -> str:
        if score >= 70:
            return "buy"
        if score >= 40:
            return "hold"
        return "avoid"

    def _format(self, result: Dict, info: Dict) -> Dict:
        masters = []
        for key in MASTER_ORDER:
            m = result[key]
            masters.append({
                "key": key,
                "name": m["name"],
                "score": int(m["score"]),
                "opinion": m["opinion"],
                "verdict": self._verdict(int(m["score"])),
            })

        avg = float(result["average_score"])
        if avg >= 70:
            overall = "buy"
        elif avg >= 50:
            overall = "hold"
        else:
            overall = "avoid"

        return {
            "ticker": result["ticker"],
            "name": info.get("shortName") or result["ticker"],
            "average_score": round(avg, 1),
            "overall_verdict": overall,
            "buy_count": sum(1 for m in masters if m["score"] >= 70),
            "hold_count": sum(1 for m in masters if 40 <= m["score"] < 70),
            "avoid_count": sum(1 for m in masters if m["score"] < 40),
            "masters": masters,
        }
