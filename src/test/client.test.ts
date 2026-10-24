import { describe, it, expect } from 'vitest';
import {
  formatMW,
  formatSignedMW,
  formatPercent,
  formatRawPercent,
  formatDateTime,
  formatTimeOnly,
} from '../api/client';

describe('API Client Formatting Utilities', () => {
  it('formats MW values correctly', () => {
    expect(formatMW(2038.91)).toBe('2,039 MW');
    expect(formatMW(0)).toBe('0 MW');
    expect(formatMW(null)).toBe('—');
    expect(formatMW(undefined)).toBe('—');
  });

  it('formats signed MW errors with positive and negative indicators', () => {
    expect(formatSignedMW(1729.07)).toBe('+1,729 MW');
    expect(formatSignedMW(-1151.42)).toBe('-1,151 MW');
    expect(formatSignedMW(0)).toBe('0 MW');
    expect(formatSignedMW(null)).toBe('—');
  });

  it('formats decimal percentages', () => {
    expect(formatPercent(0.1765)).toBe('17.6%');
    expect(formatPercent(0.518, 1)).toBe('51.8%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats raw percentages', () => {
    expect(formatRawPercent(98.6)).toBe('98.6%');
    expect(formatRawPercent(null)).toBe('—');
  });

  it('formats timestamps in Europe/London timezone', () => {
    // 2026-01-15T12:00:00Z should format with time 12:00
    const formatted = formatDateTime('2026-01-15T12:00:00Z');
    expect(formatted).toContain('12:00');
    expect(formatted).toContain('Jan');

    const timeOnly = formatTimeOnly('2026-01-15T12:00:00Z');
    expect(timeOnly).toBe('12:00');
  });
});
