import { describe, it, expect } from 'vitest';
import {
  formatMW,
  formatSignedMW,
  formatWape,
  formatSkill,
  formatPercent,
  formatRawPercent,
  formatDateTime,
  formatTimeOnly,
  formatDateOnly,
  isValidNumber,
} from '../api/client';

describe('API Client Formatting Utilities', () => {
  it('validates finite numbers correctly', () => {
    expect(isValidNumber(100)).toBe(true);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-50.5)).toBe(true);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
    expect(isValidNumber('100')).toBe(false);
  });

  it('formats MW values correctly and supports fallbacks', () => {
    expect(formatMW(2038.91)).toBe('2,039 MW');
    expect(formatMW(0)).toBe('0 MW');
    expect(formatMW(null)).toBe('—');
    expect(formatMW(undefined)).toBe('—');
    expect(formatMW(NaN, 'Not available')).toBe('Not available');
    expect(formatMW(Infinity, 'Not available')).toBe('Not available');
  });

  it('formats signed MW errors with positive and negative indicators', () => {
    expect(formatSignedMW(1729.07)).toBe('+1,729 MW');
    expect(formatSignedMW(-1151.42)).toBe('-1,151 MW');
    expect(formatSignedMW(0)).toBe('0 MW');
    expect(formatSignedMW(null)).toBe('—');
    expect(formatSignedMW(undefined, 'Insufficient data')).toBe('Insufficient data');
  });

  it('formats WAPE percentages correctly', () => {
    expect(formatWape(17.65)).toBe('17.6%');
    expect(formatWape(0.1765)).toBe('17.6%');
    expect(formatWape(0)).toBe('0.0%');
    expect(formatWape(null)).toBe('—');
  });

  it('formats Persistence Skill score with sign and percentage', () => {
    expect(formatSkill(0.518)).toBe('+51.8%');
    expect(formatSkill(-0.125)).toBe('-12.5%');
    expect(formatSkill(0)).toBe('0.0%');
    expect(formatSkill(null)).toBe('—');
  });

  it('formats general percentages with custom decimals', () => {
    expect(formatPercent(0.1765, 2)).toBe('17.65%');
    expect(formatPercent(51.8, 1)).toBe('51.8%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats raw percentages', () => {
    expect(formatRawPercent(98.6)).toBe('98.6%');
    expect(formatRawPercent(null)).toBe('—');
  });

  it('formats timestamps and dates in Europe/London timezone', () => {
    const formatted = formatDateTime('2026-01-15T12:00:00Z');
    expect(formatted).toContain('12:00');
    expect(formatted).toContain('Jan');

    const dateOnly = formatDateOnly('2026-01-15T12:00:00Z');
    expect(dateOnly).toContain('15');
    expect(dateOnly).toContain('Jan');

    const timeOnly = formatTimeOnly('2026-01-15T12:00:00Z');
    expect(timeOnly).toBe('12:00');

    expect(formatDateTime('invalid-date')).toBe('—');
    expect(formatTimeOnly('invalid-date')).toBe('—');
  });
});

