import {
  HealthResponse,
  DecisionResponse,
  VintageRecord,
  AccuracySummaryResponse,
  HorizonResponse,
  DistributionResponse,
  QualityResponse,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>('/api/health'),

  getDecision: (deliveryDate: string, cutoffOverride?: string) => {
    const params = new URLSearchParams({ deliveryDate });
    if (cutoffOverride) params.set('cutoffOverride', cutoffOverride);
    return fetchJson<DecisionResponse>(`/api/decision?${params.toString()}`);
  },

  getVintages: (params?: {
    deliveryDate?: string;
    deliveryInterval?: string;
    publishDate?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.deliveryDate) searchParams.set('deliveryDate', params.deliveryDate);
    if (params?.deliveryInterval) searchParams.set('deliveryInterval', params.deliveryInterval);
    if (params?.publishDate) searchParams.set('publishDate', params.publishDate);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return fetchJson<VintageRecord[]>(`/api/vintages${qs ? `?${qs}` : ''}`);
  },

  getAccuracySummary: (params?: {
    startDate?: string;
    endDate?: string;
    cutoffTime?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.cutoffTime) searchParams.set('cutoffTime', params.cutoffTime);
    const qs = searchParams.toString();
    return fetchJson<AccuracySummaryResponse>(`/api/accuracy/summary${qs ? `?${qs}` : ''}`);
  },

  getAccuracyHorizon: () => fetchJson<HorizonResponse>('/api/accuracy/horizon'),

  getAccuracyDistribution: (params?: {
    startDate?: string;
    endDate?: string;
    cutoffTime?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.cutoffTime) searchParams.set('cutoffTime', params.cutoffTime);
    const qs = searchParams.toString();
    return fetchJson<DistributionResponse>(`/api/accuracy/distribution${qs ? `?${qs}` : ''}`);
  },

  getQuality: () => fetchJson<QualityResponse>('/api/quality'),
};

// Formatting utilities
export function formatMW(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Math.round(val).toLocaleString()} MW`;
}

export function formatSignedMW(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${Math.round(val).toLocaleString()} MW`;
}

export function formatPercent(val?: number | null, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  // If value is already in percentage scale (> 1.0), do not multiply by 100 again
  const pct = Math.abs(val) > 1.0 ? val : val * 100;
  return `${pct.toFixed(decimals)}%`;
}

export function formatRawPercent(val?: number | null, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(decimals)}%`;
}

export function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    return dt.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function formatTimeOnly(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    return dt.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
