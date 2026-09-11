from fastapi import FastAPI

from .db import query
from .routers.rag import internal_router, router

app = FastAPI(title="BIS Sahayak AI Service", version="0.1.0")
# Routes are mounted twice: at the root for internal callers (Vercel service
# bindings, Docker loopback) and under /api/ai for the public Vercel rewrite.
app.include_router(router)
app.include_router(internal_router)
app.include_router(router, prefix="/api/ai")
app.include_router(internal_router, prefix="/api/ai")


@app.get("/health")
def health() -> dict:
    status = {"service": "ai", "ok": True, "db": "unknown"}
    try:
        query("SELECT 1")
        status["db"] = "up"
    except Exception:  # noqa: BLE001
        status["db"] = "down"
    return status


@app.get("/api/ai/health")
def health_prefixed() -> dict:
    return health()
