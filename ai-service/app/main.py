from fastapi import FastAPI

from .db import query
from .routers.rag import internal_router, router

app = FastAPI(title="BIS Sahayak AI Service", version="0.1.0")
app.include_router(router)
app.include_router(internal_router)


@app.get("/health")
def health() -> dict:
    status = {"service": "ai", "ok": True, "db": "unknown"}
    try:
        query("SELECT 1")
        status["db"] = "up"
    except Exception:  # noqa: BLE001
        status["db"] = "down"
    return status
