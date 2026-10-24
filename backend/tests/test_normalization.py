"""Unit tests for source record normalization and validation."""

import pytest
from backend.domain.normalization import (
    normalize_windfor_record,
    normalize_fuelhh_record,
    normalize_windfor_dataset,
    normalize_fuelhh_dataset,
)

def test_normalize_windfor_record_valid():
    raw = {
        "dataset": "WINDFOR",
        "publishTime": "2026-01-14T09:30:00Z",
        "startTime": "2026-01-15T12:00:00Z",
        "generation": 12450.0
    }
    rec, err = normalize_windfor_record(raw)
    assert err is None
    assert rec is not None
    assert rec.publishTime == raw["publishTime"]
    assert rec.generation == 12450.0
    assert round(rec.leadHours, 1) == 26.5

def test_normalize_windfor_record_invalid():
    # Wrong dataset
    rec, err = normalize_windfor_record({"dataset": "OTHER", "publishTime": "...", "startTime": "...", "generation": 100})
    assert rec is None and err == "WRONG_DATASET"
    
    # Missing fields
    rec, err = normalize_windfor_record({"dataset": "WINDFOR", "publishTime": "...", "generation": 100})
    assert rec is None and err == "MISSING_START_TIME"
    
    # Negative generation
    rec, err = normalize_windfor_record({"dataset": "WINDFOR", "publishTime": "2026-01-14T09:30:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": -5.0})
    assert rec is None and err == "NEGATIVE_GENERATION"
    
    # Malformed timestamp
    rec, err = normalize_windfor_record({"dataset": "WINDFOR", "publishTime": "bad-time", "startTime": "2026-01-15T12:00:00Z", "generation": 100})
    assert rec is None and err == "MALFORMED_TIMESTAMP"

def test_normalize_fuelhh_record_valid():
    raw = {
        "dataset": "FUELHH",
        "fuelType": "WIND",
        "settlementDate": "2026-01-15",
        "settlementPeriod": 25,
        "startTime": "2026-01-15T12:00:00Z",
        "publishTime": "2026-01-15T12:30:00Z",
        "generation": 11500.0
    }
    rec, err = normalize_fuelhh_record(raw)
    assert err is None
    assert rec is not None
    assert rec.generation == 11500.0
    assert rec.fuelType == "WIND"

def test_normalize_fuelhh_record_filters_non_wind():
    raw = {
        "dataset": "FUELHH",
        "fuelType": "CCGT",
        "settlementDate": "2026-01-15",
        "settlementPeriod": 25,
        "startTime": "2026-01-15T12:00:00Z",
        "publishTime": "2026-01-15T12:30:00Z",
        "generation": 8000.0
    }
    rec, err = normalize_fuelhh_record(raw)
    assert rec is None
    assert err == "EXCLUDED_FUEL_TYPE"

def test_normalize_fuelhh_record_rejects_startTime_mismatch():
    raw = {
        "dataset": "FUELHH",
        "fuelType": "WIND",
        "settlementDate": "2026-01-15",
        "settlementPeriod": 25,
        "startTime": "2026-01-15T14:00:00Z",  # Incorrect startTime for period 25 (expected 12:00)
        "publishTime": "2026-01-15T14:30:00Z",
        "generation": 11500.0
    }
    rec, err = normalize_fuelhh_record(raw)
    assert rec is None
    assert err == "START_TIME_MISMATCH"

def test_normalize_datasets():
    wf_batch = [
        {"dataset": "WINDFOR", "publishTime": "2026-01-14T09:30:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": 100},
        {"dataset": "NOT_WF", "publishTime": "2026-01-14T09:30:00Z", "startTime": "2026-01-15T12:00:00Z", "generation": 100}
    ]
    valid, diag = normalize_windfor_dataset(wf_batch)
    assert len(valid) == 1
    assert diag.get("WRONG_DATASET") == 1
