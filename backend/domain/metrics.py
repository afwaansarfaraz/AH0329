"""Statistical forecast accuracy metrics and benchmark comparison."""

import math

def calculate_mae(errors: list[float]) -> float | None:
    """Mean Absolute Error (MW)."""
    if not errors:
        return None
    return round(sum(abs(e) for e in errors) / len(errors), 2)

def calculate_rmse(errors: list[float]) -> float | None:
    """Root Mean Squared Error (MW)."""
    if not errors:
        return None
    return round(math.sqrt(sum(e**2 for e in errors) / len(errors)), 2)

def calculate_bias(errors: list[float]) -> float | None:
    """Mean Error / Bias (MW). Positive = overforecasting, Negative = underforecasting."""
    if not errors:
        return None
    return round(sum(errors) / len(errors), 2)

def calculate_wape(forecasts: list[float], actuals: list[float]) -> float | None:
    """Weighted Absolute Percentage Error (%).
    
    Formula: (sum(|forecast - actual|) / sum(|actual|)) * 100
    Returns None if denominator is zero or sample is empty.
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals):
        return None
    abs_errors = sum(abs(f - a) for f, a in zip(forecasts, actuals))
    sum_actuals = sum(abs(a) for a in actuals)
    if sum_actuals == 0:
        return None
    return round((abs_errors / sum_actuals) * 100, 2)

def calculate_persistence_skill(model_mae: float | None, persistence_mae: float | None) -> float | None:
    """Forecast Skill Score relative to Naive Persistence baseline.
    
    Formula: 1 - (model_mae / persistence_mae)
    Positive skill = model improves on baseline; Negative = worse than baseline.
    Returns None if baseline MAE is zero, undefined, or model MAE is undefined.
    """
    if model_mae is None or persistence_mae is None or persistence_mae <= 0:
        return None
    return round(1.0 - (model_mae / persistence_mae), 4)

def evaluate_paired_sample(
    forecasts: list[float],
    actuals: list[float],
    persistence_forecasts: list[float] | None = None
) -> dict:
    """Evaluate accuracy on a validated, aligned paired sample.
    
    Model and persistence baseline are strictly evaluated on the exact same paired sample.
    """
    n = len(forecasts)
    if n == 0 or len(actuals) != n:
        return {
            "sampleCount": 0,
            "mae": None,
            "rmse": None,
            "bias": None,
            "wape": None,
            "naivePersistenceMae": None,
            "persistenceSkill": None
        }
        
    errors = [f - a for f, a in zip(forecasts, actuals)]
    mae = calculate_mae(errors)
    rmse = calculate_rmse(errors)
    bias = calculate_bias(errors)
    wape = calculate_wape(forecasts, actuals)
    
    pers_mae = None
    skill = None
    if persistence_forecasts is not None and len(persistence_forecasts) == n:
        p_errors = [p - a for p, a in zip(persistence_forecasts, actuals)]
        pers_mae = calculate_mae(p_errors)
        skill = calculate_persistence_skill(mae, pers_mae)
        
    return {
        "sampleCount": n,
        "mae": mae,
        "rmse": rmse,
        "bias": bias,
        "wape": wape,
        "naivePersistenceMae": pers_mae,
        "persistenceSkill": skill
    }
