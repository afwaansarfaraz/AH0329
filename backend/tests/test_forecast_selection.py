"""Unit tests for decision-time forecast selection and anti-leakage rules."""

import pytest
from datetime import datetime, timezone
from backend.domain.schemas import ForecastRecord, HourlyActual
from backend.domain.forecast_selection import select_forecasts_for_delivery_date

def test_select_forecasts_anti_leakage_and_cutoff_boundary(sample_forecasts):
    # Delivery date: Jan 15, 2026
    # Cutoff: Jan 14 at 09:20:00 UTC
    cutoff_dt = datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)
    
    intervals, summary, diag = select_forecasts_for_delivery_date(
        forecasts=sample_forecasts,
        delivery_date_str="2026-01-15",
        cutoff_dt=cutoff_dt
    )
    
    # Check hour 12 (12:00:00Z)
    hour_12 = [it for it in intervals if it.hour == 12][0]
    assert hour_12.isEligible is True
    # In sample_forecasts, the record published at 09:20:00Z has gen=5500.0.
    # The record at 09:20:01Z has gen=6000.0 (one second later, must be rejected).
    # The record at 15:30:00Z has gen=7000.0 (later revision, must be rejected).
    assert hour_12.publishTime == "2026-01-14T09:20:00Z"
    assert hour_12.forecastMW == 5500.0

def test_select_forecasts_cutoff_override_allows_later_revision(sample_forecasts):
    # If cutoff is overridden to 17:00:00 UTC on Jan 14:
    # The 15:30:00Z forecast (gen=7000.0) becomes eligible and should be selected!
    cutoff_override_dt = datetime(2026, 1, 14, 17, 0, 0, tzinfo=timezone.utc)
    
    intervals, _, _ = select_forecasts_for_delivery_date(
        forecasts=sample_forecasts,
        delivery_date_str="2026-01-15",
        cutoff_dt=cutoff_override_dt
    )
    
    hour_12 = [it for it in intervals if it.hour == 12][0]
    assert hour_12.publishTime == "2026-01-14T15:30:00Z"
    assert hour_12.forecastMW == 7000.0

def test_select_forecasts_hindcast_excluded():
    # Hindcast: startTime < publishTime
    hindcast = ForecastRecord(
        publishTime="2026-01-14T09:20:00Z",
        startTime="2026-01-14T06:00:00Z",
        generation=3000.0,
        leadHours=-3.33
    )
    cutoff_dt = datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)
    intervals, _, _ = select_forecasts_for_delivery_date(
        forecasts=[hindcast],
        delivery_date_str="2026-01-14",
        cutoff_dt=cutoff_dt
    )
    # Hour 6 should not be eligible as a forward forecast
    hour_6 = [it for it in intervals if it.hour == 6][0]
    assert hour_6.isEligible is False
    assert hour_6.forecastMW is None

def test_select_forecasts_missing_hours_reported():
    # Only hour 12 has a forecast
    f_single = ForecastRecord(
        publishTime="2026-01-14T07:30:00Z",
        startTime="2026-01-15T12:00:00Z",
        generation=5000.0,
        leadHours=28.5
    )
    cutoff_dt = datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)
    intervals, _, diag = select_forecasts_for_delivery_date(
        forecasts=[f_single],
        delivery_date_str="2026-01-15",
        cutoff_dt=cutoff_dt
    )
    assert len(intervals) == 24
    assert diag["coveredHours"] == 1
    assert diag["missingHours"] == 23

def test_select_forecasts_with_actuals():
    f = ForecastRecord(
        publishTime="2026-01-14T07:30:00Z",
        startTime="2026-01-15T12:00:00Z",
        generation=5500.0,
        leadHours=28.5
    )
    actuals = {
        "2026-01-15T12:00:00Z": HourlyActual(
            startTime="2026-01-15T12:00:00Z",
            actualMW=5000.0,
            periodCount=2,
            isComplete=True
        )
    }
    cutoff_dt = datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)
    intervals, summary, diag = select_forecasts_for_delivery_date(
        forecasts=[f],
        delivery_date_str="2026-01-15",
        cutoff_dt=cutoff_dt,
        actuals_hourly=actuals
    )
    hour_12 = [it for it in intervals if it.hour == 12][0]
    assert hour_12.forecastMW == 5500.0
    assert hour_12.actualMW == 5000.0
    # Error convention: forecast - actual = 5500 - 5000 = +500 MW (overforecasting)
    assert hour_12.signedErrorMW == 500.0
    assert hour_12.absoluteErrorMW == 500.0
    assert summary is not None
    assert summary.sampleCount == 1
    assert summary.mae == 500.0
    assert summary.bias == 500.0
