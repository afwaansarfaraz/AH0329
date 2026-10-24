"""Typed domain schemas and API response models for WindDesk."""

from typing import Any
from pydantic import BaseModel, Field

class ForecastRecord(BaseModel):
    publishTime: str
    startTime: str
    generation: float
    leadHours: float

class HalfHourlyActual(BaseModel):
    settlementDate: str
    settlementPeriod: int
    startTime: str
    publishTime: str
    generation: float
    fuelType: str = "WIND"

class HourlyActual(BaseModel):
    startTime: str
    actualMW: float
    periodCount: int
    isComplete: bool

class DecisionInterval(BaseModel):
    deliveryInterval: str
    hour: int
    publishTime: str | None = None
    leadHours: float | None = None
    forecastMW: float | None = None
    actualMW: float | None = None
    signedErrorMW: float | None = None
    absoluteErrorMW: float | None = None
    isEligible: bool = False

class DecisionSummary(BaseModel):
    sampleCount: int
    mae: float | None = None
    rmse: float | None = None
    bias: float | None = None
    wape: float | None = None

class DecisionResponse(BaseModel):
    deliveryDate: str
    cutoffUtc: str
    cutoffLondon: str
    cutoffPolicy: str
    intervals: list[DecisionInterval]
    summary: DecisionSummary | None = None
    coverage: dict[str, Any]

class VintageRecord(BaseModel):
    publishTime: str
    startTime: str
    generation: float
    leadHours: float

class AccuracySummaryResponse(BaseModel):
    evaluationWindow: dict[str, str]
    cutoffPolicy: str
    sampleCount: int
    mae: float | None = None
    rmse: float | None = None
    bias: float | None = None
    wape: float | None = None
    naivePersistenceMae: float | None = None
    persistenceSkill: float | None = None
    coverage: dict[str, Any]

class HorizonBucketMetrics(BaseModel):
    bucket: str
    minLeadHours: float
    maxLeadHours: float
    sampleCount: int
    mae: float | None = None
    rmse: float | None = None
    bias: float | None = None
    wape: float | None = None

class HorizonResponse(BaseModel):
    sampleDescription: str
    retentionWindowHours: float
    buckets: list[HorizonBucketMetrics]

class DistributionResponse(BaseModel):
    sampleDescription: str
    errorConvention: str
    sampleCount: int
    p5: float | None = None
    p50: float | None = None
    p95: float | None = None
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    evaluationWindow: dict[str, str]
    cutoffPolicy: str

class QualityResponse(BaseModel):
    sourceCoverage: dict[str, Any]
    retentionCoverage: dict[str, Any]
    missingIntervals: dict[str, Any]
    duplicateRecords: dict[str, Any]
    invalidRecords: dict[str, Any]
    evaluationSampleCount: int
    warnings: list[str]

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    artifactLoaded: bool
    retentionWindowHours: float
    recordCounts: dict[str, int]
    coverage: dict[str, Any]
