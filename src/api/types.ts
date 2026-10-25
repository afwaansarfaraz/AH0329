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
    startDate?: string;
    endDate?: string;
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
    evaluatedDeliveryDays?: number;
    pairedHours?: number;
    missingActualHours?: number;
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
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  };
  cutoffPolicy: string;
}

export interface QualityResponse {
  sourceCoverage: {
    forecastRecordsRaw?: number;
    actualRecordsRaw?: number;
    forecastStartMin?: string | null;
    forecastStartMax?: string | null;
    actualStartMin?: string | null;
    actualStartMax?: string | null;
    [key: string]: unknown;
  };
  retentionCoverage: {
    retentionPolicy?: string;
    retainedForecastCount?: number;
    retainedActualHours?: number;
    hindcastRecordsExcluded?: number;
    [key: string]: unknown;
  };
  missingIntervals: {
    missingActualHoursCount?: number;
    incompleteActualHoursCount?: number;
    missingActualHours?: string[];
    [key: string]: unknown;
  };
  duplicateRecords: {
    actualDuplicatesEncountered?: number;
    forecastDuplicatesEncountered?: number;
    [key: string]: unknown;
  };
  invalidRecords: Record<string, unknown>;
  evaluationSampleCount: number;
  warnings: string[];
}

