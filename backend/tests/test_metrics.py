"""Unit tests for statistical metrics and persistence skill benchmark scoring."""

import pytest
from backend.domain.metrics import (
    calculate_mae,
    calculate_rmse,
    calculate_bias,
    calculate_wape,
    calculate_persistence_skill,
    evaluate_paired_sample,
)

def test_mae_rmse_bias():
    # forecast = [110, 80], actual = [100, 100]
    # errors = [+10, -20]
    # abs_errors = [10, 20]
    # mae = 15.0
    # rmse = sqrt((100 + 400) / 2) = sqrt(250) = 15.81
    # bias = (10 - 20) / 2 = -5.0 (underforecasting overall)
    errors = [10.0, -20.0]
    assert calculate_mae(errors) == 15.0
    assert calculate_rmse(errors) == 15.81
    assert calculate_bias(errors) == -5.0

def test_positive_bias_overforecasting():
    # forecast = [120, 130], actual = [100, 100]
    # errors = [+20, +30] -> bias = +25.0
    errors = [20.0, 30.0]
    assert calculate_bias(errors) == 25.0

def test_wape():
    forecasts = [110.0, 90.0]
    actuals = [100.0, 100.0]
    # abs_errors = 10 + 10 = 20
    # sum_actuals = 200
    # WAPE = (20 / 200) * 100 = 10.0%
    assert calculate_wape(forecasts, actuals) == 10.0

def test_wape_zero_actual_denominator():
    # When sum(actuals) is 0, WAPE is undefined (None)
    assert calculate_wape([10.0, 20.0], [0.0, 0.0]) is None

def test_persistence_skill():
    # model_mae = 10.0, pers_mae = 20.0 -> skill = 1 - (10/20) = 0.5 (50% improvement)
    assert calculate_persistence_skill(10.0, 20.0) == 0.5
    
    # model_mae = 25.0, pers_mae = 20.0 -> skill = 1 - (25/20) = -0.25 (worse than baseline)
    assert calculate_persistence_skill(25.0, 20.0) == -0.25
    
    # baseline MAE is 0 or undefined -> None
    assert calculate_persistence_skill(10.0, 0.0) is None
    assert calculate_persistence_skill(10.0, None) is None
    assert calculate_persistence_skill(None, 20.0) is None

def test_empty_sample():
    assert calculate_mae([]) is None
    assert calculate_rmse([]) is None
    assert calculate_bias([]) is None
    assert calculate_wape([], []) is None
    
    res = evaluate_paired_sample([], [])
    assert res["sampleCount"] == 0
    assert res["mae"] is None
    assert res["persistenceSkill"] is None

def test_evaluate_paired_sample_symmetry():
    f = [110.0, 90.0, 105.0]
    a = [100.0, 100.0, 100.0]
    p = [120.0, 80.0, 110.0] # persistence
    
    res = evaluate_paired_sample(f, a, p)
    assert res["sampleCount"] == 3
    # Model: errors = [+10, -10, +5], abs = [10, 10, 5], MAE = 25/3 = 8.33
    assert res["mae"] == 8.33
    # Persistence: errors = [+20, -20, +10], abs = [20, 20, 10], pers_MAE = 50/3 = 16.67
    assert res["naivePersistenceMae"] == 16.67
    # Skill = 1 - (8.33 / 16.67) ~ 0.5003
    assert round(res["persistenceSkill"], 2) == 0.5
