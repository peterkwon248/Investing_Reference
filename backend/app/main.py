from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"[START] {settings.app_name} v{settings.version} starting...")
    # DB init
    try:
        from app.db.database import init_db, get_redis
        await init_db()
        await get_redis()
    except Exception as e:
        print(f"[WARN] DB/Redis init: {e}")
    yield
    # Shutdown
    try:
        from app.db.database import close_db
        await close_db()
    except Exception:
        pass
    print("[STOP] Shutting down...")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": settings.version}

    return app


app = create_app()
