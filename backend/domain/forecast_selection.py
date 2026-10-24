"""Decision-time forecast selection engine enforcing strict anti-leakage rules."""

from datetime import datetime
from .schemas import ForecastRecord, HourlyActual, DecisionInterval, DecisionSummary
from .timestamps import parse_iso_utc

def select_forecasts_for_delivery_date(
    forecasts: list[ForecastRecord],
    delivery_date_str: str,
    cutoff_dt: datetime,
    actuals_hourly: dict[str, HourlyActual] | None = None
) -> tuple[list[DecisionInterval], DecisionSummary | None, dict[str, int]]:
    """Select the latest eligible forecast vintage published on or before the decision cutoff.
    
    Anti-leakage rules:
    1. publishTime <= cutoff_dt (inclusive; any publishTime > cutoff is rejected).
    2. Exclude retrospective hindcast records (leadHours < 0).
    3. Select latest publication vintage per delivery hour.
    4. Actuals never influence historical forecast selection.
    """
    # 24 delivery hours: 00:00:00Z to 23:00:00Z
    intervals: list[DecisionInterval] = []
    
    # Filter eligible forecasts for this delivery date satisfying anti-leakage
    eligible_by_st: dict[str, ForecastRecord] = {}
    
    for f in forecasts:
        if not f.startTime.startswith(delivery_date_str):
            continue
        if f.leadHours < 0:
            continue
        p_dt = parse_iso_utc(f.publishTime)
        if p_dt <= cutoff_dt:
            st = f.startTime
            if st not in eligible_by_st or f.publishTime > eligible_by_st[st].publishTime:
                eligible_by_st[st] = f
                
    errors: list[float] = []
    abs_errors: list[float] = []
    sum_actual = 0.0
    covered_hours = 0
    
    for hr in range(24):
        st = f"{delivery_date_str}T{hr:02d}:00:00Z"
        selected = eligible_by_st.get(st)
        
        actual_rec = actuals_hourly.get(st) if actuals_hourly else None
        act_val = actual_rec.actualMW if actual_rec and actual_rec.isComplete else None
        
        if selected is not None:
            f_mw = selected.generation
            p_time = selected.publishTime
            lead = selected.leadHours
            is_elig = True
            covered_hours += 1
        else:
            f_mw = None
            p_time = None
            lead = None
            is_elig = False
            
        signed_err = None
        abs_err = None
        if f_mw is not None and act_val is not None:
            signed_err = round(f_mw - act_val, 2)
            abs_err = round(abs(f_mw - act_val), 2)
            errors.append(signed_err)
            abs_errors.append(abs_err)
            sum_actual += act_val
            
        intervals.append(DecisionInterval(
            deliveryInterval=st,
            hour=hr,
            publishTime=p_time,
            leadHours=lead,
            forecastMW=f_mw,
            actualMW=act_val,
            signedErrorMW=signed_err,
            absoluteErrorMW=abs_err,
            isEligible=is_elig
        ))
        
    summary = None
    if errors:
        n = len(errors)
        mae = round(sum(abs_errors) / n, 2)
        rmse = round((sum(e**2 for e in errors) / n) ** 0.5, 2)
        bias = round(sum(errors) / n, 2)
        wape = round((sum(abs_errors) / sum_actual) * 100, 2) if sum_actual > 0 else None
        summary = DecisionSummary(
            sampleCount=n,
            mae=mae,
            rmse=rmse,
            bias=bias,
            wape=wape
        )
        
    diagnostics = {
        "totalHours": 24,
        "coveredHours": covered_hours,
        "missingHours": 24 - covered_hours,
        "pairedEvaluations": len(errors)
    }
    return intervals, summary, diagnostics
