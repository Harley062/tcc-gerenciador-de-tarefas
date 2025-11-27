"""
Metrics API Routes - Expose performance metrics for observability
"""
from fastapi import APIRouter, Depends
from presentation.api.dependencies import get_current_user
from presentation.api.middleware.metrics_middleware import metrics_collector
from domain.entities.user import User

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/performance")
async def get_performance_metrics(current_user: User = Depends(get_current_user)):
    """Get comprehensive performance metrics including P95, throughput, and error rates"""
    return metrics_collector.get_metrics_summary()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    metrics = metrics_collector.get_metrics_summary()
    
    is_healthy = (
        metrics["p95_latency_ms"] < 500 and
        metrics["error_rate_percent"] < 0.1
    )
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "p95_latency_ms": metrics["p95_latency_ms"],
        "error_rate_percent": metrics["error_rate_percent"],
        "throughput_rps": metrics["throughput_rps"],
        "total_requests": metrics["total_requests"]
    }
