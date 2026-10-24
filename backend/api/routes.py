"""FastAPI routes for WindDesk decision support and accuracy analytics."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from .dependencies import get_service
from ..domain.service import WindDeskService
from ..domain.schemas import (
    HealthResponse,
    DecisionResponse,
    VintageRecord,
    AccuracySummaryResponse,
    HorizonResponse,
    DistributionResponse,
    QualityResponse,
)

router = APIRouter(prefix="/api", tags=["WindDesk API"])

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health and Artifact Loading Verification"
)
def get_health(service: WindDeskService = Depends(get_service)):
    """Return service status and verify that the processed artifact is loaded and readable."""
    health = service.get_health()
    if not health.artifactLoaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded or unavailable."
        )
    return health

@router.get(
    "/decision",
    response_model=DecisionResponse,
    summary="Day-Ahead Decision-Time Forecast Selection"
)
def get_decision(
    deliveryDate: str = Query(
        ...,
        description="Target delivery date in YYYY-MM-DD format (e.g., 2026-01-15)",
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    ),
    cutoffOverride: str | None = Query(
        None,
        description="Optional decision cutoff time override HH:MM or HH:MM:SS in Europe/London (default: 09:20:00)",
        pattern=r"^\d{2}:\d{2}(:\d{2})?$"
    ),
    service: WindDeskService = Depends(get_service)
):
    """Retrieve the latest eligible forecasts published before the decision cutoff for a delivery date."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    try:
        # Standardize HH:MM to HH:MM:00
        formatted_cutoff = None
        if cutoffOverride:
            formatted_cutoff = cutoffOverride if len(cutoffOverride) == 8 else f"{cutoffOverride}:00"
        return service.get_decision(deliveryDate, formatted_cutoff)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute decision for delivery date {deliveryDate}: {str(exc)}"
        )

@router.get(
    "/vintages",
    response_model=list[VintageRecord],
    summary="Forecast Publication Vintages Inspection"
)
def get_vintages(
    deliveryDate: str | None = Query(None, description="Filter by delivery date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    deliveryInterval: str | None = Query(None, description="Filter by exact delivery interval start ISO UTC (e.g. 2026-01-15T12:00:00Z)"),
    publishDate: str | None = Query(None, description="Filter by publication date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return (1-500)"),
    service: WindDeskService = Depends(get_service)
):
    """Inspect retained forecast publication runs and revisions."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    return service.get_vintages(
        delivery_date=deliveryDate,
        delivery_interval=deliveryInterval,
        publish_date=publishDate,
        limit=limit
    )

@router.get(
    "/accuracy/summary",
    response_model=AccuracySummaryResponse,
    summary="Decision-Cutoff Accuracy Summary"
)
def get_accuracy_summary(
    startDate: str | None = Query(None, description="Evaluation window start date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    endDate: str | None = Query(None, description="Evaluation window end date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoffTime: str | None = Query(None, description="Decision cutoff time override HH:MM or HH:MM:SS", pattern=r"^\d{2}:\d{2}(:\d{2})?$"),
    service: WindDeskService = Depends(get_service)
):
    """Compute headline accuracy metrics (MAE, RMSE, Bias, WAPE, Naive Persistence Skill) on the decision-cutoff sample."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    try:
        formatted_cutoff = None
        if cutoffTime:
            formatted_cutoff = cutoffTime if len(cutoffTime) == 8 else f"{cutoffTime}:00"
        return service.get_accuracy_summary(startDate, endDate, formatted_cutoff)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get(
    "/accuracy/horizon",
    response_model=HorizonResponse,
    summary="Forecast Lead-Time Horizon Accuracy"
)
def get_accuracy_horizon(
    service: WindDeskService = Depends(get_service)
):
    """Compute error metrics segmented by forecast lead-time buckets across all retained forward vintages."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    return service.get_accuracy_horizon()

@router.get(
    "/accuracy/distribution",
    response_model=DistributionResponse,
    summary="Decision-Cutoff Empirical Error Distribution"
)
def get_accuracy_distribution(
    startDate: str | None = Query(None, description="Evaluation window start date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    endDate: str | None = Query(None, description="Evaluation window end date YYYY-MM-DD", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoffTime: str | None = Query(None, description="Decision cutoff time override HH:MM or HH:MM:SS", pattern=r"^\d{2}:\d{2}(:\d{2})?$"),
    service: WindDeskService = Depends(get_service)
):
    """Compute historical empirical signed-error percentiles (P5, P50, P95) on the decision-cutoff sample."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    try:
        formatted_cutoff = None
        if cutoffTime:
            formatted_cutoff = cutoffTime if len(cutoffTime) == 8 else f"{cutoffTime}:00"
        return service.get_accuracy_distribution(startDate, endDate, formatted_cutoff)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get(
    "/quality",
    response_model=QualityResponse,
    summary="Data Quality and Coverage Diagnostics"
)
def get_quality(
    service: WindDeskService = Depends(get_service)
):
    """Expose source coverage, resolution alignment rules, missing intervals, and data quality warnings."""
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processed artifact is not loaded."
        )
    return service.get_quality()
