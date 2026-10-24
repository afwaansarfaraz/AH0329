"""Integration and contract tests for all seven WindDesk API endpoints."""

import pytest
from fastapi.testclient import TestClient

def test_api_health(client: TestClient):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "WindDesk API"
    assert data["artifactLoaded"] is True
    assert data["retentionWindowHours"] == 72.0
    assert data["recordCounts"]["retainedForecasts"] > 0
    assert data["recordCounts"]["hourlyActuals"] > 0
    # Ensure no internal filesystem paths are exposed
    assert "C:\\" not in str(data)
    assert "/Users/" not in str(data)

def test_api_decision_valid(client: TestClient):
    resp = client.get("/api/decision?deliveryDate=2026-01-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert "cutoffUtc" in data
    assert "cutoffLondon" in data
    assert len(data["intervals"]) == 24
    # Check hour 0 and 23
    assert data["intervals"][0]["hour"] == 0
    assert data["intervals"][23]["hour"] == 23
    assert data["summary"] is not None
    assert data["summary"]["mae"] > 0

def test_api_decision_cutoff_override(client: TestClient):
    resp = client.get("/api/decision?deliveryDate=2026-01-15&cutoffOverride=11:00:00")
    assert resp.status_code == 200
    data = resp.json()
    assert "11:00:00" in data["cutoffPolicy"]
    assert len(data["intervals"]) == 24

def test_api_decision_validation_errors(client: TestClient):
    # Missing required deliveryDate
    resp = client.get("/api/decision")
    assert resp.status_code == 422
    
    # Invalid date pattern
    resp = client.get("/api/decision?deliveryDate=2026/01/15")
    assert resp.status_code == 422
    
    # Invalid cutoff format
    resp = client.get("/api/decision?deliveryDate=2026-01-15&cutoffOverride=not-a-time")
    assert resp.status_code == 422

def test_api_vintages(client: TestClient):
    resp = client.get("/api/vintages?deliveryDate=2026-01-15&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    if data:
        item = data[0]
        assert "publishTime" in item
        assert "startTime" in item
        assert "generation" in item
        assert "leadHours" in item

def test_api_accuracy_summary(client: TestClient):
    resp = client.get("/api/accuracy/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sampleCount"] == 744  # 31 delivery days * 24h
    assert data["mae"] > 0
    assert data["rmse"] > 0
    assert data["bias"] is not None
    assert data["wape"] > 0
    assert data["naivePersistenceMae"] > 0
    assert data["persistenceSkill"] is not None

def test_api_accuracy_horizon(client: TestClient):
    resp = client.get("/api/accuracy/horizon")
    assert resp.status_code == 200
    data = resp.json()
    assert "sampleDescription" in data
    assert data["retentionWindowHours"] == 72.0
    assert isinstance(data["buckets"], list)
    assert len(data["buckets"]) >= 5
    for b in data["buckets"]:
        assert "bucket" in b
        assert "sampleCount" in b

def test_api_accuracy_distribution(client: TestClient):
    resp = client.get("/api/accuracy/distribution")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sampleCount"] == 744
    assert data["p5"] is not None
    assert data["p50"] is not None
    assert data["p95"] is not None
    assert data["p5"] <= data["p50"] <= data["p95"]
    assert "errorConvention" in data

def test_api_quality(client: TestClient):
    resp = client.get("/api/quality")
    assert resp.status_code == 200
    data = resp.json()
    assert "sourceCoverage" in data
    assert "retentionCoverage" in data
    assert "missingIntervals" in data
    assert "warnings" in data
    assert len(data["warnings"]) >= 4

def test_api_root(client: TestClient):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "WindDesk API"
    assert data["health"] == "/api/health"
