"""Unit tests for deterministic ingestion pipeline."""

import pytest
import json
import tempfile
from pathlib import Path
from backend.data.ingest import run_ingestion

def test_ingestion_offline_with_fixtures(tmp_path):
    # Create isolated mock DATA directory
    mock_data = tmp_path / "DATA"
    mock_data.mkdir()
    
    mock_out = tmp_path / "artifacts"
    mock_out.mkdir()
    
    # 1. Create mock WINDFOR file
    wf_data = [
        # Lead time = 24h (forward, retained)
        {"dataset": "WINDFOR", "publishTime": "2026-01-14T12:00:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": 5000.0},
        # Lead time = -2h (hindcast, excluded)
        {"dataset": "WINDFOR", "publishTime": "2026-01-15T14:00:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": 4800.0},
        # Lead time = 100h (over 72h, excluded)
        {"dataset": "WINDFOR", "publishTime": "2026-01-10T12:00:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": 4000.0}
    ]
    with open(mock_data / "windfor_2026_01_all.json", "w", encoding="utf-8") as f:
        json.dump(wf_data, f)
        
    # 2. Create mock FUELHH file
    fuel_data = [
        # Hour 12: Period 25 and 26
        {"dataset": "FUELHH", "fuelType": "WIND", "settlementDate": "2026-01-15", "settlementPeriod": 25, "startTime": "2026-01-15T12:00:00Z", "publishTime": "2026-01-15T12:30:00Z", "generation": 4000.0},
        {"dataset": "FUELHH", "fuelType": "WIND", "settlementDate": "2026-01-15", "settlementPeriod": 26, "startTime": "2026-01-15T12:30:00Z", "publishTime": "2026-01-15T13:00:00Z", "generation": 6000.0},
        # Excluded fuel type
        {"dataset": "FUELHH", "fuelType": "NUCLEAR", "settlementDate": "2026-01-15", "settlementPeriod": 25, "startTime": "2026-01-15T12:00:00Z", "publishTime": "2026-01-15T12:30:00Z", "generation": 8000.0}
    ]
    with open(mock_data / "fuelhh_2026_01_all_periods.json", "w", encoding="utf-8") as f:
        json.dump(fuel_data, f)
        
    report = run_ingestion(data_dir=mock_data, output_dir=mock_out)
    assert report["status"] == "SUCCESS"
    assert report["records"]["rawForecastsJan"] == 3
    assert report["records"]["retainedForecasts"] == 1
    assert report["diagnostics"]["hindcastsExcluded"] == 1
    assert report["diagnostics"]["over72hExcluded"] == 1
    assert report["records"]["windHalfHourlyActuals"] == 2
    assert report["records"]["hourlyActuals"] == 1
    
    # Check created artifacts
    json_art = mock_out / "wind_jan_decisions.json"
    csv_art = mock_out / "wind_jan_decisions.csv"
    assert json_art.exists()
    assert csv_art.exists()
    
    with open(json_art, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    assert loaded["version"] == "1.0.0"
    assert len(loaded["forecasts"]) == 1
    assert loaded["actuals"]["2026-01-15T12:00:00Z"]["actualMW"] == 5000.0

def test_ingestion_fails_on_missing_source(tmp_path):
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    with pytest.raises(FileNotFoundError, match="Required WINDFOR file missing"):
        run_ingestion(data_dir=empty_dir, output_dir=tmp_path / "out")
