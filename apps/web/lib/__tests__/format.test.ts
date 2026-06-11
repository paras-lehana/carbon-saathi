/**
 * format: display contracts — kg→tonne switchover at 1000 kg and en-IN
 * digit grouping for rupees (lakh/crore boundaries).
 */
import { describe, expect, it } from 'vitest';
import { formatInr, formatKgCo2, formatNumber } from '../format';

describe('formatKgCo2', () => {
  it('keeps sub-tonne values in kilograms', () => {
    expect(formatKgCo2(850)).toBe('850 kg CO₂e');
  });

  it('switches to tonnes with one decimal at 1000 kg', () => {
    expect(formatKgCo2(2400)).toBe('2.4 t CO₂e');
  });
});

describe('formatInr', () => {
  it('formats with Indian digit grouping and no paise', () => {
    expect(formatInr(78000)).toBe('₹78,000');
    // en-IN groups by lakh: 3,00,000 — not 300,000.
    expect(formatInr(300000)).toBe('₹3,00,000');
  });
});

describe('formatNumber', () => {
  it('rounds and groups with the en-IN locale', () => {
    expect(formatNumber(12500.4)).toBe('12,500');
  });
});
