import asyncio
import os
import random
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from logger import init_db, log_event

app = FastAPI(title="payment-service")

DOWNSTREAM_TIMEOUT_MS = int(os.environ.get("DOWNSTREAM_TIMEOUT_MS", "5000"))


@app.on_event("startup")
def startup():
    init_db()
    log_event("INFO", "payment-service started", timeout_ms=DOWNSTREAM_TIMEOUT_MS)


class ChargeRequest(BaseModel):
    order_id: str
    amount: float
    trace_id: str | None = None


async def call_bank_api() -> dict:
    """Simulates a third-party bank API with realistic variable latency."""
    latency_seconds = random.uniform(0.2, 3.0)
    await asyncio.sleep(latency_seconds)
    return {"status": "approved", "latency_ms": round(latency_seconds * 1000)}


@app.post("/charge")
async def charge(req: ChargeRequest):
    trace_id = req.trace_id or str(uuid.uuid4())
    timeout_seconds = DOWNSTREAM_TIMEOUT_MS / 1000
    start = time.monotonic()

    log_event(
        "INFO",
        "Charge request received",
        trace_id=trace_id,
        order_id=req.order_id,
        amount=req.amount,
    )

    try:
        result = await asyncio.wait_for(call_bank_api(), timeout=timeout_seconds)
        duration_ms = round((time.monotonic() - start) * 1000)
        log_event(
            "INFO",
            "Charge succeeded",
            trace_id=trace_id,
            order_id=req.order_id,
            duration_ms=duration_ms,
            bank_latency_ms=result["latency_ms"],
        )
        return {"status": "success", "trace_id": trace_id, "order_id": req.order_id}

    except asyncio.TimeoutError:
        duration_ms = round((time.monotonic() - start) * 1000)
        log_event(
            "ERROR",
            "Charge failed: downstream bank API timeout",
            trace_id=trace_id,
            order_id=req.order_id,
            duration_ms=duration_ms,
            configured_timeout_ms=DOWNSTREAM_TIMEOUT_MS,
        )
        return JSONResponse(
            status_code=504,
            content={
                "status": "error",
                "reason": "downstream_timeout",
                "trace_id": trace_id,
            },
        )


@app.get("/health")
def health():
    return {"status": "ok", "service": "payment-service"}