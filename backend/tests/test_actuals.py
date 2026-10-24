"""Unit tests for half-hourly actual aggregation, completeness, and persistence selection."""

import pytest
from datetime import datetime, timezone
from backend.domain.schemas import HalfHourlyActual
from backend.domain.actuals import (
    aggregate_half_hourly_to_hourly,
    select_persistence_actual,
    deduplicate_actuals,
)

def test_aggregate_half_hourly_to_hourly_complete():
    records = [
        # Hour 10: Period 21 (10:00) and Period 22 (10:30)
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=21,
            startTime="2026-01-15T10:00:00Z",
            publishTime="2026-01-15T10:30:00Z",
            generation=4000.0
        ),
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=22,
            startTime="2026-01-15T10:30:00Z",
            publishTime="2026-01-15T11:00:00Z",
            generation=6000.0
        )
    ]
    hourly, diag = aggregate_half_hourly_to_hourly(records)
    assert len(hourly) == 1
    assert "2026-01-15T10:00:00Z" in hourly
    hour_rec = hourly["2026-01-15T10:00:00Z"]
    # Mean: (4000 + 6000) / 2 = 5000 MW
    assert hour_rec.actualMW == 5000.0
    assert hour_rec.periodCount == 2
    assert hour_rec.isComplete is True
    assert diag["completeHours"] == 1
    assert diag["incompleteHours"] == 0

def test_aggregate_half_hourly_to_hourly_missing_second_half():
    records = [
        # Hour 10: Only Period 21 (10:00) is present
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=21,
            startTime="2026-01-15T10:00:00Z",
            publishTime="2026-01-15T10:30:00Z",
            generation=4000.0
        )
    ]
    hourly, diag = aggregate_half_hourly_to_hourly(records)
    assert len(hourly) == 1
    hour_rec = hourly["2026-01-15T10:00:00Z"]
    assert hour_rec.actualMW == 4000.0
    assert hour_rec.periodCount == 1
    assert hour_rec.isComplete is False
    assert diag["completeHours"] == 0
    assert diag["incompleteHours"] == 1

def test_aggregate_half_hourly_to_hourly_missing_first_half():
    records = [
        # Hour 10: Only Period 22 (10:30) is present
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=22,
            startTime="2026-01-15T10:30:00Z",
            publishTime="2026-01-15T11:00:00Z",
            generation=6000.0
        )
    ]
    hourly, diag = aggregate_half_hourly_to_hourly(records)
    assert len(hourly) == 1
    hour_rec = hourly["2026-01-15T10:00:00Z"]
    assert hour_rec.actualMW == 6000.0
    assert hour_rec.periodCount == 1
    assert hour_rec.isComplete is False
    assert diag["completeHours"] == 0
    assert diag["incompleteHours"] == 1

def test_deduplicate_actuals():
    records = [
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=1,
            startTime="2026-01-15T00:00:00Z",
            publishTime="2026-01-15T00:30:00Z",
            generation=1000.0
        ),
        # Exact duplicate of settlementDate & settlementPeriod
        HalfHourlyActual(
            settlementDate="2026-01-15",
            settlementPeriod=1,
            startTime="2026-01-15T00:00:00Z",
            publishTime="2026-01-15T00:30:00Z",
            generation=1000.0
        )
    ]
    unique, dups = deduplicate_actuals(records)
    assert len(unique) == 1
    assert dups == 1

def test_select_persistence_actual(sample_half_hourly_actuals):
    # Cutoff: Jan 14 at 09:20 UTC
    # Lag: 60 minutes -> Availability threshold is 08:20 UTC
    # Settlement periods close times:
    # Period 16: 07:30 to 08:00 (close: 08:00) <= 08:20 -> Eligible!
    # Period 17: 08:00 to 08:30 (close: 08:30) > 08:20 -> NOT eligible!
    cutoff_dt = datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)
    pers = select_persistence_actual(sample_half_hourly_actuals, cutoff_dt, lag_minutes=60)
    assert pers is not None
    assert pers.settlementDate == "2026-01-14"
    assert pers.settlementPeriod == 16
    assert pers.generation == 5000.0

def test_select_persistence_actual_none_available():
    # Cutoff earlier than any available actual close time
    cutoff_dt = datetime(2026, 1, 14, 0, 15, 0, tzinfo=timezone.utc)
    records = [
        HalfHourlyActual(
            settlementDate="2026-01-14",
            settlementPeriod=1,
            startTime="2026-01-14T00:00:00Z",
            publishTime="2026-01-14T00:30:00Z",
            generation=5000.0
        )
    ]
    # Period 1 closes at 00:30. Threshold is 00:15 - 60m = 23:15 prev day.
    pers = select_persistence_actual(records, cutoff_dt, lag_minutes=60)
    assert pers is None
