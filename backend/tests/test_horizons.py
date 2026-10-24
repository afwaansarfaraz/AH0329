"""Unit tests for lead-time horizon bucketing and evaluation."""

import pytest
from backend.domain.schemas import ForecastRecord, HourlyActual
from backend.domain.horizons import calculate_horizon_metrics

def test_calculate_horizon_metrics():
    # Setup forecasts across different lead time buckets
    forecasts = [
        # Bucket 0-12h (lead = 6.0)
        ForecastRecord(publishTime="2026-01-15T06:00:00Z", startTime="2026-01-15T12:00:00Z", generation=5200.0, leadHours=6.0),
        # Bucket 12-24h (lead = 18.0)
        ForecastRecord(publishTime="2026-01-14T18:00:00Z", startTime="2026-01-15T12:00:00Z", generation=5500.0, leadHours=18.0),
        # Bucket 24-36h (lead = 30.0)
        ForecastRecord(publishTime="2026-01-14T06:00:00Z", startTime="2026-01-15T12:00:00Z", generation=6000.0, leadHours=30.0),
        # Negative lead (hindcast, should be excluded)
        ForecastRecord(publishTime="2026-01-15T15:00:00Z", startTime="2026-01-15T12:00:00Z", generation=5000.0, leadHours=-3.0),
        # Over 72h lead (should be excluded)
        ForecastRecord(publishTime="2026-01-10T00:00:00Z", startTime="2026-01-15T12:00:00Z", generation=4000.0, leadHours=120.0)
    ]
    actuals = {
        "2026-01-15T12:00:00Z": HourlyActual(
            startTime="2026-01-15T12:00:00Z",
            actualMW=5000.0,
            periodCount=2,
            isComplete=True
        )
    }
    
    buckets = [(0, 12), (12, 24), (24, 36), (36, 48), (48, 72)]
    metrics = calculate_horizon_metrics(forecasts, actuals, buckets)
    assert len(metrics) == 5
    
    # Bucket 0-12h: 1 record, f=5200, a=5000 -> MAE=200, Bias=+200
    b0 = metrics[0]
    assert b0.bucket == "0-12h"
    assert b0.sampleCount == 1
    assert b0.mae == 200.0
    assert b0.bias == 200.0
    
    # Bucket 12-24h: 1 record, f=5500, a=5000 -> MAE=500
    b1 = metrics[1]
    assert b1.sampleCount == 1
    assert b1.mae == 500.0
    
    # Bucket 24-36h: 1 record, f=6000, a=5000 -> MAE=1000
    b2 = metrics[2]
    assert b2.sampleCount == 1
    assert b2.mae == 1000.0
    
    # Bucket 36-48h and 48-72h: 0 records
    assert metrics[3].sampleCount == 0
    assert metrics[3].mae is None
    assert metrics[4].sampleCount == 0
    assert metrics[4].mae is None
