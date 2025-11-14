from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from application.services.auth_service import AuthService
from presentation.api.dependencies import database, get_auth_service
from presentation.api.middleware.rate_limit import RateLimitMiddleware
from presentation.api.routes import auth, tasks
from presentation.config import get_settings
from presentation.websocket.handlers import handle_websocket

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.create_tables()
    yield


app = FastAPI(
    title="TaskMaster API",
    description="Sistema de Gerenciamento de Tarefas Inteligente",
    version="1.0.0",
    lifespan=lifespan,
)

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


@app.get("/")
async def root():
    return {
        "message": "TaskMaster API",
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
