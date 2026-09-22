import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from backend.config import settings
from backend.database import init_db, check_db_connection
from backend.routes.session import router as session_router
from backend.routes.action import router as action_router
from backend.routes.telemetry import router as telemetry_router
from backend.routes.observability import router as observability_router

from backend.websocket_server import ws_app
import asyncio

async def start_ws_server():
    import uvicorn
    config = uvicorn.Config(ws_app, host="127.0.0.1", port=3000, log_level="warning")
    server = uvicorn.Server(config)
    await server.serve()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    ws_task = asyncio.create_task(start_ws_server())
    yield
    # Shutdown
    ws_task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Privacy-First Visual Browser Agent Backend (SIH 2026)",
    lifespan=lifespan
)

# CORS with explicit origin patterns and chrome-extension regex support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^(chrome-extension://.*|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 1. 1MB Request Guard & Correlation ID Middleware
@app.middleware("http")
async def security_and_correlation_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req_{uuid.uuid4().hex[:10]}")
    request.state.request_id = request_id

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_REQUEST_SIZE_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "success": False,
                "error": {
                    "code": "REQUEST_TOO_LARGE",
                    "message": f"Payload exceeds {settings.MAX_REQUEST_SIZE_BYTES} bytes limit."
                },
                "request_id": request_id
            }
        )

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# 2. Standardized Validation Error Envelope
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", "req_unknown")
    errors = exc.errors()
    first_msg = errors[0].get("msg", "Validation error") if errors else "Invalid request format"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first_msg
            },
            "request_id": req_id
        }
    )


# 3. Health & Readiness
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": "privagent-backend",
        "demo_mode": settings.DEMO_MODE,
        "timestamp": time.time()
    }


@app.get("/health/ready", tags=["System"])
def readiness_check():
    db_ok = check_db_connection()
    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "NOT_READY",
                "database": "DISCONNECTED",
                "environment": settings.ENVIRONMENT,
                "error": "Database connectivity check failed"
            }
        )
    return {
        "status": "READY",
        "database": "CONNECTED",
        "environment": settings.ENVIRONMENT
    }


# Include Routers
app.include_router(session_router)
app.include_router(action_router)
app.include_router(telemetry_router)
app.include_router(observability_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

