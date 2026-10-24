"""Unit tests for data quality and integrity reporting."""

import pytest
from backend.domain.schemas import ForecastRecord, HourlyActual
from backend.domain.quality import build_quality_report

def test_build_quality_report():
    forecasts = [
        ForecastRecord(publishTime="2026-01-14T09:20:00Z", startTime="2026-01-15T12:00:00Z", generation=5000.0, leadHours=26.67)
    ]
    actuals = {
        "2026-01-15T12:00:00Z": HourlyActual(startTime="2026-01-15T12:00:00Z", actualMW=4800.0, periodCount=2, isComplete=True)
    }
    meta = {
        "rawForecastRecords": 100,
        "rawActualRecords": 200,
        "hindcastRecordsExcluded": 20,
        "actualDuplicates": 2,
        "forecastDuplicates": 0,
        "invalidRecordsDiagnostics": {"WRONG_DATASET": 5}
    }
    
    report = build_quality_report(
        forecasts=forecasts,
        actuals_hourly=actuals,
        ingestion_metadata=meta,
        evaluation_sample_count=1
    )
    
    assert report.sourceCoverage["forecastRecordsRaw"] == 100
    assert report.retentionCoverage["hindcastRecordsExcluded"] == 20
    assert report.duplicateRecords["actualDuplicatesEncountered"] == 2
    assert report.invalidRecords["WRONG_DATASET"] == 5
    assert report.evaluationSampleCount == 1
    assert len(report.warnings) >= 4
