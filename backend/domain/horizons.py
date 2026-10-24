"""Lead-time horizon bucketing and accuracy analysis across retained forecast vintages."""

from .schemas import ForecastRecord, HourlyActual, HorizonBucketMetrics
from .metrics import calculate_mae, calculate_rmse, calculate_bias, calculate_wape
from .config import DEFAULT_HORIZON_BUCKETS

def calculate_horizon_metrics(
    forecasts: list[ForecastRecord],
    actuals_hourly: dict[str, HourlyActual],
    buckets: list[tuple[float, float]] | None = None
) -> list[HorizonBucketMetrics]:
    """Calculate error metrics segmented by forecast lead-time buckets.
    
    Lead time definition: leadHours = startTime - publishTime.
    Excludes negative lead times (hindcast records).
    Applies the documented <= 72h retention limit.
    """
    if buckets is None:
        buckets = DEFAULT_HORIZON_BUCKETS
        
    bucket_pairs: dict[str, tuple[list[float], list[float], tuple[float, float]]] = {}
    
    for i, (b_min, b_max) in enumerate(buckets):
        label = f"{int(b_min)}-{int(b_max)}h"
        bucket_pairs[label] = ([], [], (b_min, b_max))
        
    for f in forecasts:
        if f.leadHours < 0 or f.leadHours > 72.0:
            continue
            
        act_rec = actuals_hourly.get(f.startTime)
        if not act_rec or not act_rec.isComplete:
            continue
            
        act_val = act_rec.actualMW
        f_val = f.generation
        
        # Assign to bucket
        for i, (b_min, b_max) in enumerate(buckets):
            label = f"{int(b_min)}-{int(b_max)}h"
            is_last = (i == len(buckets) - 1)
            # Semi-open interval [min, max), inclusive on upper bound for last bucket
            if (b_min <= f.leadHours < b_max) or (is_last and b_min <= f.leadHours <= b_max):
                bucket_pairs[label][0].append(f_val)
                bucket_pairs[label][1].append(act_val)
                break
                
    result: list[HorizonBucketMetrics] = []
    for label, (f_list, a_list, (b_min, b_max)) in bucket_pairs.items():
        n = len(f_list)
        if n > 0:
            errors = [f - a for f, a in zip(f_list, a_list)]
            mae = calculate_mae(errors)
            rmse = calculate_rmse(errors)
            bias = calculate_bias(errors)
            wape = calculate_wape(f_list, a_list)
        else:
            mae = rmse = bias = wape = None
            
        result.append(HorizonBucketMetrics(
            bucket=label,
            minLeadHours=float(b_min),
            maxLeadHours=float(b_max),
            sampleCount=n,
            mae=mae,
            rmse=rmse,
            bias=bias,
            wape=wape
        ))
        
    return result
