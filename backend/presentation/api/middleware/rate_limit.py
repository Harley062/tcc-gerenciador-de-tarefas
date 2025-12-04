import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60, tokens_per_minute: int = 40000):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.tokens_per_minute = tokens_per_minute
        self.request_counts: dict[str, list[float]] = defaultdict(list)
        self.token_counts: dict[str, list[tuple[float, int]]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_id = self._get_client_id(request)
        current_time = time.time()

        self._clean_old_entries(client_id, current_time)

        if not self._check_request_limit(client_id, current_time):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
            )

        self.request_counts[client_id].append(current_time)

        response = await call_next(request)
        return response

    def _get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0]
        return request.client.host if request.client else "unknown"

    def _clean_old_entries(self, client_id: str, current_time: float) -> None:
        cutoff_time = current_time - 60

        self.request_counts[client_id] = [
            t for t in self.request_counts[client_id] if t > cutoff_time
        ]

        self.token_counts[client_id] = [
            (t, tokens) for t, tokens in self.token_counts[client_id] if t > cutoff_time
        ]

    def _check_request_limit(self, client_id: str, current_time: float) -> bool:
        return len(self.request_counts[client_id]) < self.requests_per_minute

    def add_token_usage(self, client_id: str, tokens: int) -> None:
        current_time = time.time()
        self.token_counts[client_id].append((current_time, tokens))
