"""Half-hourly actual aggregation, completeness validation, and persistence baseline selection."""

from collections import defaultdict
from datetime import datetime, timedelta
from .schemas import HalfHourlyActual, HourlyActual
from .timestamps import parse_iso_utc, settlement_period_to_close_time

def deduplicate_actuals(records: list[HalfHourlyActual]) -> tuple[list[HalfHourlyActual], int]:
    """Deduplicate half-hourly actual records using (settlementDate, settlementPeriod).
    
    Returns (deduplicated_list, duplicate_count).
    """
    seen: set[tuple[str, int]] = set()
    unique: list[HalfHourlyActual] = []
    duplicates = 0
    for r in records:
        key = (r.settlementDate, r.settlementPeriod)
        if key in seen:
            duplicates += 1
        else:
            seen.add(key)
            unique.append(r)
    return unique, duplicates

def aggregate_half_hourly_to_hourly(
    records: list[HalfHourlyActual]
) -> tuple[dict[str, HourlyActual], dict[str, int]]:
    """Aggregate half-hourly generation records to hourly intervals using arithmetic mean.
    
    For hour [T, T+60m), the true average generation is:
    mean(MW_T, MW_T+30m) = (MW_T + MW_T+30m) / 2.0
    
    If an hour is missing either half-hour period, it is marked as isComplete=False.
    Returns (hourly_actuals_dict, diagnostics).
    """
    deduped, dup_count = deduplicate_actuals(records)
    
    # Map by exact startTime: e.g. "2026-01-01T00:00:00Z" -> generation
    by_time = {r.startTime: r.generation for r in deduped}
    
    # Identify unique hourly start times (strings ending in :00:00Z)
    hour_starts = sorted(list(set(r.startTime[:14] + "00:00Z" for r in deduped)))
    
    hourly_actuals: dict[str, HourlyActual] = {}
    complete_count = 0
    incomplete_count = 0
    
    for h_start in hour_starts:
        t0 = h_start
        t30 = h_start[:14] + "30:00Z"
        
        has_t0 = t0 in by_time
        has_t30 = t30 in by_time
        
        if has_t0 and has_t30:
            avg_mw = round((by_time[t0] + by_time[t30]) / 2.0, 2)
            hourly_actuals[h_start] = HourlyActual(
                startTime=h_start,
                actualMW=avg_mw,
                periodCount=2,
                isComplete=True
            )
            complete_count += 1
        elif has_t0:
            hourly_actuals[h_start] = HourlyActual(
                startTime=h_start,
                actualMW=round(by_time[t0], 2),
                periodCount=1,
                isComplete=False
            )
            incomplete_count += 1
        elif has_t30:
            hourly_actuals[h_start] = HourlyActual(
                startTime=h_start,
                actualMW=round(by_time[t30], 2),
                periodCount=1,
                isComplete=False
            )
            incomplete_count += 1
            
    diagnostics = {
        "rawRecords": len(records),
        "duplicateRecords": dup_count,
        "totalHours": len(hourly_actuals),
        "completeHours": complete_count,
        "incompleteHours": incomplete_count
    }
    return hourly_actuals, diagnostics

def select_persistence_actual(
    actuals: list[HalfHourlyActual],
    cutoff_dt: datetime,
    lag_minutes: int = 60
) -> HalfHourlyActual | None:
    """Select the naive persistence baseline actual available at decision cutoff.
    
    Policy:
    Actual observations are eligible only when settlement period close <= (cutoff - lag_minutes).
    From eligible observations, select the latest by close time.
    """
    availability_threshold = cutoff_dt - timedelta(minutes=lag_minutes)
    
    eligible: list[tuple[datetime, HalfHourlyActual]] = []
    for r in actuals:
        close_dt = settlement_period_to_close_time(r.settlementDate, r.settlementPeriod)
        if close_dt <= availability_threshold:
            eligible.append((close_dt, r))
            
    if not eligible:
        return None
        
    eligible.sort(key=lambda x: x[0])
    return eligible[-1][1]
