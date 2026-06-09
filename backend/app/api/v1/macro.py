from fastapi import APIRouter, HTTPException

from app.services.macro_service import MacroService
from app.schemas.macro import MacroResponse

router = APIRouter(prefix="/analysis", tags=["macro"])
service = MacroService()


@router.get("/macro", response_model=MacroResponse)
async def get_macro():
    """매크로 AI 시장 진단: 글로벌 지표 1개월 흐름 기반 결정론적 스코어링.

    티커 파라미터 없음 (시장 전체 스냅샷). 모든 지표 fetch 실패 시 503.
    """
    result = await service.get_market()
    if not result:
        raise HTTPException(status_code=503, detail="시장 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.")
    return result
