import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPercent } from '../format';

describe('formatCurrency', () => {
  it('formats a number as EUR using fr-FR grouping/decimal conventions', () => {
    // fr-FR uses a non-breaking space as the thousands separator and a comma
    // for decimals — normalize whitespace so the assertion isn't tripped up
    // by which non-breaking space variant Intl happens to emit.
    const formatted = formatCurrency(1234.5).replace(/\s/g, ' ');
    expect(formatted).toContain('1 234,50');
    expect(formatted).toContain('€');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0,00');
  });
});

describe('formatPercent', () => {
  it('converts a 0-1 ratio to a percentage string with one decimal by default', () => {
    expect(formatPercent(0.256)).toBe('25.6%');
  });

  it('respects a custom fraction-digit count', () => {
    expect(formatPercent(0.256, 0)).toBe('26%');
  });
});
