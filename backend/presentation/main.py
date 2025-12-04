from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from application.services.auth_service import AuthService
from presentation.api.dependencies import database, get_auth_service
from presentation.api.middleware.error_handler import (
    general_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from presentation.api.middleware.logging_middleware import LoggingMiddleware
from presentation.api.middleware.metrics_middleware import MetricsMiddleware
from presentation.api.middleware.rate_limit import RateLimitMiddleware
from presentation.api.routes import ai, auth, projects, tasks, metrics, analytics
from presentation.api.routes import settings as settings_router
from presentation.config import get_settings
from presentation.logging_config import setup_logging
from presentation.websocket.handlers import handle_websocket

settings = get_settings()
setup_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.create_tables()
    yield


app = FastAPI(
    title="SGTI API",
    description="Sistema Gerenciador de Tarefas Inteligente",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.add_middleware(MetricsMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, requests_per_minute=60, tokens_per_minute=40000)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(settings_router.router)
app.include_router(ai.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "SGTI API - Sistema Gerenciador de Tarefas Inteligente",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    await handle_websocket(websocket, token, auth_service)
