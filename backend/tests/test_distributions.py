"""Unit tests for empirical forecast error distributions and quantile calculations."""

import pytest
from backend.domain.distributions import compute_quantile, calculate_error_distribution

def test_compute_quantile_fixture():
    # 1 to 10 inclusive: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    data = [float(x) for x in range(1, 11)]
    # P50 (median) = 5.5
    assert compute_quantile(data, 50.0) == 5.5
    # P5: k = 9 * 0.05 = 0.45 -> data[0] + 0.45 * (data[1] - data[0]) = 1.0 + 0.45 = 1.45
    assert compute_quantile(data, 5.0) == 1.45
    # P95: k = 9 * 0.95 = 8.55 -> data[8] + 0.55 * (data[9] - data[8]) = 9.0 + 0.55 = 9.55
    assert compute_quantile(data, 95.0) == 9.55

def test_calculate_error_distribution():
    # Errors: [-100, -50, 0, 50, 100]
    errors = [-100.0, -50.0, 0.0, 50.0, 100.0]
    dist = calculate_error_distribution(errors)
    assert dist["sampleCount"] == 5
    assert dist["p50"] == 0.0
    assert dist["min"] == -100.0
    assert dist["max"] == 100.0
    assert dist["mean"] == 0.0
    # P5 should be close to -100, P95 close to +100
    assert dist["p5"] < 0
    assert dist["p95"] > 0

def test_calculate_error_distribution_empty():
    dist = calculate_error_distribution([])
    assert dist["sampleCount"] == 0
    assert dist["p5"] is None
    assert dist["p50"] is None
    assert dist["p95"] is None
    assert dist["mean"] is None

def test_single_element_distribution():
    dist = calculate_error_distribution([42.0])
    assert dist["sampleCount"] == 1
    assert dist["p5"] == 42.0
    assert dist["p50"] == 42.0
    assert dist["p95"] == 42.0
    assert dist["mean"] == 42.0
