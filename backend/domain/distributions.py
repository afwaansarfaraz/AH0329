"""Empirical forecast error distributions and quantile estimation."""

def compute_quantile(sorted_data: list[float], p: float) -> float | None:
    """Compute empirical quantile using standard linear interpolation (R Type 7 / numpy default).
    
    Index k = (n - 1) * (p / 100.0)
    Quantile = X[i] + f * (X[i+1] - X[i]) where i = floor(k), f = k - i.
    """
    if not sorted_data:
        return None
    n = len(sorted_data)
    if n == 1:
        return round(sorted_data[0], 2)
    k = (n - 1) * (p / 100.0)
    i = int(k)
    f = k - i
    if i + 1 < n:
        val = sorted_data[i] + f * (sorted_data[i + 1] - sorted_data[i])
    else:
        val = sorted_data[i]
    return round(val, 2)

def calculate_error_distribution(errors: list[float]) -> dict:
    """Calculate empirical distribution statistics for signed forecast errors (forecast - actual).
    
    Returns P5, P50 (median), P95, min, max, mean, and sample count.
    These are empirical historical percentiles, not guaranteed future prediction intervals.
    """
    if not errors:
        return {
            "sampleCount": 0,
            "p5": None,
            "p50": None,
            "p95": None,
            "min": None,
            "max": None,
            "mean": None
        }
        
    s = sorted(errors)
    n = len(s)
    p5 = compute_quantile(s, 5.0)
    p50 = compute_quantile(s, 50.0)
    p95 = compute_quantile(s, 95.0)
    min_val = round(s[0], 2)
    max_val = round(s[-1], 2)
    mean_val = round(sum(s) / n, 2)
    
    return {
        "sampleCount": n,
        "p5": p5,
        "p50": p50,
        "p95": p95,
        "min": min_val,
        "max": max_val,
        "mean": mean_val
    }
