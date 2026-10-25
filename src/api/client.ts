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

// Formatting utilities adhering to WindDesk missing-value policy
export function isValidNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

export function formatMW(val?: number | null, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  return `${Math.round(val).toLocaleString()} MW`;
}

export function formatSignedMW(val?: number | null, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  const rounded = Math.round(val);
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded.toLocaleString()} MW`;
}

export function formatWape(val?: number | null, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  // Backend returns WAPE as raw percentage (e.g. 17.65)
  const pct = Math.abs(val) <= 1.0 && val !== 0 ? val * 100 : val;
  return `${pct.toFixed(1)}%`;
}

export function formatSkill(val?: number | null, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  // Backend returns skill as decimal ratio (e.g. 0.518 -> +51.8%)
  const pct = Math.abs(val) <= 1.0 ? val * 100 : val;
  const prefix = pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(1)}%`;
}

export function formatPercent(val?: number | null, decimals = 1, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  const pct = Math.abs(val) <= 1.0 && val !== 0 ? val * 100 : val;
  return `${pct.toFixed(decimals)}%`;
}

export function formatRawPercent(val?: number | null, decimals = 1, fallback = '—'): string {
  if (!isValidNumber(val)) return fallback;
  return `${val.toFixed(decimals)}%`;
}

export function formatDateOnly(isoStr?: string | null, fallback = '—'): string {
  if (!isoStr) return fallback;
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fallback;
  }
}

export function formatDateTime(isoStr?: string | null, fallback = '—'): string {
  if (!isoStr) return fallback;
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}

export function formatTimeOnly(isoStr?: string | null, fallback = '—'): string {
  if (!isoStr) return fallback;
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}

