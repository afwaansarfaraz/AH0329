"""Data quality and integrity diagnostics for WindDesk."""

from typing import Any
from .schemas import QualityResponse, ForecastRecord, HourlyActual
from .config import EVALUATION_DELIVERY_START, EVALUATION_DELIVERY_END

def build_quality_report(
    forecasts: list[ForecastRecord],
    actuals_hourly: dict[str, HourlyActual],
    ingestion_metadata: dict[str, Any] | None = None,
    evaluation_sample_count: int = 0
) -> QualityResponse:
    """Construct data quality diagnostics and integrity warnings."""
    meta = ingestion_metadata or {}
    
    # Check expected delivery dates: Jan 2 - Feb 1
    # Check missing actual hours
    missing_actual_hours: list[str] = []
    incomplete_actual_hours: list[str] = []
    
    # Expected hours between start and end
    from datetime import date, timedelta
    s_d = date.fromisoformat(EVALUATION_DELIVERY_START)
    e_d = date.fromisoformat(EVALUATION_DELIVERY_END)
    
    curr = s_d
    while curr <= e_d:
        d_str = curr.isoformat()
        for hr in range(24):
            st = f"{d_str}T{hr:02d}:00:00Z"
            if st not in actuals_hourly:
                missing_actual_hours.append(st)
            elif not actuals_hourly[st].isComplete:
                incomplete_actual_hours.append(st)
        curr += timedelta(days=1)
        
    source_coverage = {
        "forecastRecordsRaw": meta.get("rawForecastRecords", len(forecasts)),
        "actualRecordsRaw": meta.get("rawActualRecords", len(actuals_hourly) * 2),
        "forecastStartMin": min((f.startTime for f in forecasts), default=None),
        "forecastStartMax": max((f.startTime for f in forecasts), default=None),
        "actualStartMin": min(actuals_hourly.keys(), default=None),
        "actualStartMax": max(actuals_hourly.keys(), default=None)
    }
    
    retention_coverage = {
        "retentionPolicy": "<= 72h forward lead time",
        "retainedForecastCount": len(forecasts),
        "retainedActualHours": len(actuals_hourly),
        "hindcastRecordsExcluded": meta.get("hindcastRecordsExcluded", 0)
    }
    
    missing_intervals = {
        "missingActualHoursCount": len(missing_actual_hours),
        "incompleteActualHoursCount": len(incomplete_actual_hours),
        "missingActualHours": missing_actual_hours[:10]  # sample of up to 10
    }
    
    duplicate_records = {
        "actualDuplicatesEncountered": meta.get("actualDuplicates", 0),
        "forecastDuplicatesEncountered": meta.get("forecastDuplicates", 0)
    }
    
    invalid_records = meta.get("invalidRecordsDiagnostics", {})
    
    warnings = [
        "WINDFOR forecast resolution is hourly (:00:00Z). Half-hourly (:30:00Z) forecasts do not exist in source.",
        "FUELHH actuals (30-minute settlement periods) are reconciled to hourly intervals using arithmetic mean.",
        "Naive persistence baseline assumes a 60-minute availability lag prior to decision cutoff.",
        "Selectable delivery dates for January decisions span Jan 2 - Feb 1, 2026 under the D-1 09:20 cutoff."
    ]
    if missing_actual_hours:
        warnings.append(f"Notice: {len(missing_actual_hours)} delivery hours are missing corresponding actuals.")
        
    return QualityResponse(
        sourceCoverage=source_coverage,
        retentionCoverage=retention_coverage,
        missingIntervals=missing_intervals,
        duplicateRecords=duplicate_records,
        invalidRecords=invalid_records,
        evaluationSampleCount=evaluation_sample_count,
        warnings=warnings
    )
