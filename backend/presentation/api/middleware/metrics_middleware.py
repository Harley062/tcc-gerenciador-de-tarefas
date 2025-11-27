"""
Metrics Middleware - Collects performance metrics for observability
Tracks P95 latency, throughput, error rates as per TCC requirements
"""
import logging
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Callable, Dict, Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("sgti")


class MetricsCollector:
    """Collects and aggregates performance metrics"""
    
    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.request_durations = deque(maxlen=window_size)
        self.error_count = 0
        self.success_count = 0
        self.total_requests = 0
        self.start_time = datetime.utcnow()
        self.endpoint_metrics: Dict[str, Dict[str, Any]] = {}
    
    def record_request(self, path: str, duration_ms: float, status_code: int):
        """Record a request's metrics"""
        self.total_requests += 1
        self.request_durations.append(duration_ms)
        
        if status_code >= 500:
            self.error_count += 1
        else:
            self.success_count += 1
        
        if path not in self.endpoint_metrics:
            self.endpoint_metrics[path] = {
                "count": 0,
                "durations": deque(maxlen=100),
                "errors": 0
            }
        
        self.endpoint_metrics[path]["count"] += 1
        self.endpoint_metrics[path]["durations"].append(duration_ms)
        if status_code >= 500:
            self.endpoint_metrics[path]["errors"] += 1
    
    def get_p95_latency(self) -> float:
        """Calculate P95 latency in milliseconds"""
        if not self.request_durations:
            return 0.0
        
        sorted_durations = sorted(self.request_durations)
        p95_index = int(len(sorted_durations) * 0.95)
        return sorted_durations[p95_index] if p95_index < len(sorted_durations) else sorted_durations[-1]
    
    def get_error_rate(self) -> float:
        """Calculate error rate as percentage"""
        if self.total_requests == 0:
            return 0.0
        return (self.error_count / self.total_requests) * 100
    
    def get_throughput(self) -> float:
        """Calculate requests per second"""
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        if elapsed == 0:
            return 0.0
        return self.total_requests / elapsed
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary"""
        p95 = self.get_p95_latency()
        error_rate = self.get_error_rate()
        throughput = self.get_throughput()
        
        avg_latency = sum(self.request_durations) / len(self.request_durations) if self.request_durations else 0
        
        endpoint_stats = {}
        for path, metrics in self.endpoint_metrics.items():
            if metrics["durations"]:
                sorted_durations = sorted(metrics["durations"])
                p95_index = int(len(sorted_durations) * 0.95)
                endpoint_p95 = sorted_durations[p95_index] if p95_index < len(sorted_durations) else sorted_durations[-1]
                endpoint_avg = sum(metrics["durations"]) / len(metrics["durations"])
                endpoint_error_rate = (metrics["errors"] / metrics["count"]) * 100 if metrics["count"] > 0 else 0
                
                endpoint_stats[path] = {
                    "count": metrics["count"],
                    "p95_ms": round(endpoint_p95, 2),
                    "avg_ms": round(endpoint_avg, 2),
                    "error_rate": round(endpoint_error_rate, 2)
                }
        
        return {
            "total_requests": self.total_requests,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "p95_latency_ms": round(p95, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "error_rate_percent": round(error_rate, 2),
            "throughput_rps": round(throughput, 2),
            "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds(),
            "endpoints": endpoint_stats
        }


metrics_collector = MetricsCollector()


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect performance metrics"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            
            metrics_collector.record_request(
                path=request.url.path,
                duration_ms=duration_ms,
                status_code=response.status_code
            )
            
            if duration_ms > 500:
                logger.warning(
                    "Slow request detected",
                    extra={
                        "path": request.url.path,
                        "duration_ms": round(duration_ms, 2),
                        "threshold_ms": 500
                    }
                )
            
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            metrics_collector.record_request(
                path=request.url.path,
                duration_ms=duration_ms,
                status_code=500
            )
            
            raise
