/**
 * Typed response schemas and query parameters matching WindDesk FastAPI backend.
 */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  artifactLoaded: boolean;
  retentionWindowHours: number;
  recordCounts: {
    retainedForecasts: number;
    hourlyActuals: number;
    halfHourlyActuals?: number;
  };
  coverage: {
    evaluationStartUtc?: string;
    evaluationEndUtc?: string;
    evaluationDeliveryDays?: number;
    [key: string]: unknown;
  };
}

export interface HourlyActual {
  startTime: string;
  actualMW: number;
  periodCount: number;
  isComplete: boolean;
}

export interface DecisionInterval {
  deliveryInterval: string;
  hour: number;
  publishTime: string | null;
  leadHours: number | null;
  forecastMW: number | null;
  actualMW: number | null;
  signedErrorMW: number | null;
  absoluteErrorMW: number | null;
  isEligible: boolean;
}

export interface DecisionSummary {
  sampleCount: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
}

export interface DecisionResponse {
  deliveryDate: string;
  cutoffUtc: string;
  cutoffLondon: string;
  cutoffPolicy: string;
  intervals: DecisionInterval[];
  summary: DecisionSummary | null;
  coverage: {
    totalExpectedHours?: number;
    actualHoursAvailable?: number;
    forecastHoursAvailable?: number;
    pairedHoursCount?: number;
    missingActualHours?: string[];
    missingForecastHours?: string[];
    [key: string]: unknown;
  };
}

export interface VintageRecord {
  publishTime: string;
  startTime: string;
  generation: number;
  leadHours: number;
}

export interface AccuracySummaryResponse {
  evaluationWindow: {
    startUtc: string;
    endUtc: string;
    deliveryDays: number;
    cutoffPolicy?: string;
    [key: string]: unknown;
  };
  cutoffPolicy: string;
  sampleCount: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
  naivePersistenceMae: number | null;
  persistenceSkill: number | null;
  coverage: {
    totalExpectedHours?: number;
    missingHoursCount?: number;
    missingHoursList?: string[];
    [key: string]: unknown;
  };
}

export interface HorizonBucketMetrics {
  bucket: string;
  minLeadHours: number;
  maxLeadHours: number;
  sampleCount: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
}

export interface HorizonResponse {
  sampleDescription: string;
  retentionWindowHours: number;
  buckets: HorizonBucketMetrics[];
}

export interface DistributionResponse {
  sampleDescription: string;
  errorConvention: string;
  sampleCount: number;
  p5: number | null;
  p50: number | null;
  p95: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  evaluationWindow: {
    startUtc: string;
    endUtc: string;
    [key: string]: unknown;
  };
  cutoffPolicy: string;
}

export interface QualityResponse {
  sourceCoverage: {
    windforStartDate?: string;
    windforEndDate?: string;
    windforRecordCount?: number;
    fuelhhStartDate?: string;
    fuelhhEndDate?: string;
    fuelhhRecordCount?: number;
    fuelhhWindRecords?: number;
    [key: string]: unknown;
  };
  retentionCoverage: {
    retainedForecastCount?: number;
    retainedHourlyActualCount?: number;
    retainedDeliveryIntervals?: number;
    [key: string]: unknown;
  };
  missingIntervals: {
    missingHourlyActualCount?: number;
    missingHourlyActuals?: string[];
    missingSettlementPeriodCount?: number;
    [key: string]: unknown;
  };
  duplicateRecords: {
    duplicateForecastKeys?: number;
    duplicateActualKeys?: number;
    [key: string]: unknown;
  };
  invalidRecords: {
    invalidForecastsCount?: number;
    invalidActualsCount?: number;
    [key: string]: unknown;
  };
  evaluationSampleCount: number;
  warnings: string[];
}
