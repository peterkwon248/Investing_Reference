from pydantic import BaseModel
from typing import List


class MasterScore(BaseModel):
    key: str
    name: str
    score: int
    opinion: str
    verdict: str  # buy | hold | avoid


class MastersAnalysisResponse(BaseModel):
    ticker: str
    name: str
    average_score: float
    overall_verdict: str  # buy | hold | avoid
    buy_count: int
    hold_count: int
    avoid_count: int
    masters: List[MasterScore]
