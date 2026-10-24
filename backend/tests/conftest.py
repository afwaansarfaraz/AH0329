"""Pytest fixtures for WindDesk test suite."""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.main import app
from backend.domain.schemas import ForecastRecord, HalfHourlyActual, HourlyActual
from backend.domain.service import WindDeskService

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)

@pytest.fixture
def sample_forecasts():
    """Deterministic fixture of forecast records around a decision cutoff."""
    return [
        # Issued Jan 14 at 07:30 UTC for Jan 15 12:00 UTC (eligible)
        ForecastRecord(
            publishTime="2026-01-14T07:30:00Z",
            startTime="2026-01-15T12:00:00Z",
            generation=5000.0,
            leadHours=28.5
        ),
        # Issued Jan 14 at 09:20 UTC (exactly at cutoff, eligible)
        ForecastRecord(
            publishTime="2026-01-14T09:20:00Z",
            startTime="2026-01-15T12:00:00Z",
            generation=5500.0,
            leadHours=26.6667
        ),
        # Issued Jan 14 at 09:20:01 UTC (one second after cutoff, NOT eligible)
        ForecastRecord(
            publishTime="2026-01-14T09:20:01Z",
            startTime="2026-01-15T12:00:00Z",
            generation=6000.0,
            leadHours=26.6664
        ),
        # Issued Jan 14 at 15:30 UTC (later revision, NOT eligible for D-1 09:20)
        ForecastRecord(
            publishTime="2026-01-14T15:30:00Z",
            startTime="2026-01-15T12:00:00Z",
            generation=7000.0,
            leadHours=20.5
        ),
        # Hindcast record (startTime < publishTime, leadHours < 0)
        ForecastRecord(
            publishTime="2026-01-14T09:20:00Z",
            startTime="2026-01-14T06:00:00Z",
            generation=4000.0,
            leadHours=-3.3333
        )
    ]

@pytest.fixture
def sample_half_hourly_actuals():
    """Deterministic half-hourly actuals for Jan 14 and Jan 15."""
    records = []
    # Jan 14 Periods 1..48 (5000 MW flat)
    for sp in range(1, 49):
        # startTime = 00:00 + (sp-1)*30m
        h = (sp - 1) // 2
        m = 30 if sp % 2 == 0 else 0
        st = f"2026-01-14T{h:02d}:{m:02d}:00Z"
        records.append(HalfHourlyActual(
            settlementDate="2026-01-14",
            settlementPeriod=sp,
            startTime=st,
            publishTime=st,
            generation=5000.0,
            fuelType="WIND"
        ))
    # Jan 15 Hour 12 (Period 25 and 26)
    records.append(HalfHourlyActual(
        settlementDate="2026-01-15",
        settlementPeriod=25,
        startTime="2026-01-15T12:00:00Z",
        publishTime="2026-01-15T12:30:00Z",
        generation=4800.0,
        fuelType="WIND"
    ))
    records.append(HalfHourlyActual(
        settlementDate="2026-01-15",
        settlementPeriod=26,
        startTime="2026-01-15T12:30:00Z",
        publishTime="2026-01-15T13:00:00Z",
        generation=5200.0,
        fuelType="WIND"
    ))
    return records
