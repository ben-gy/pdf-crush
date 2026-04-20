import { describe, expect, it } from 'vitest';
import { formatBytes, formatMs, calcReductionPct } from '../src/ui';

describe('formatBytes', () => {
  it('formats bytes under 1024', () => {
    expect(formatBytes(512)).toBe('512 B');
  });
  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });
  it('formats megabytes', () => {
    expect(formatBytes(1_500_000)).toBe('1.4 MB');
  });
  it('formats large MB without decimal when >= 100', () => {
    expect(formatBytes(150 * 1024 * 1024)).toBe('150 MB');
  });
  it('handles 0', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
  it('handles negative (returns em-dash)', () => {
    expect(formatBytes(-1)).toBe('—');
  });
  it('handles NaN (returns em-dash)', () => {
    expect(formatBytes(NaN)).toBe('—');
  });
  it('formats gigabytes', () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });
});

describe('formatMs', () => {
  it('formats sub-second in ms', () => {
    expect(formatMs(450)).toBe('450ms');
  });
  it('formats seconds', () => {
    expect(formatMs(2500)).toBe('2.5s');
  });
  it('rounds ms', () => {
    expect(formatMs(999)).toBe('999ms');
  });
  it('formats exactly 1000ms as 1.0s', () => {
    expect(formatMs(1000)).toBe('1.0s');
  });
});

describe('calcReductionPct', () => {
  it('calculates 50% reduction', () => {
    expect(calcReductionPct(1000, 500)).toBe(50);
  });
  it('calculates 85% reduction', () => {
    expect(calcReductionPct(10_000_000, 1_500_000)).toBe(85);
  });
  it('returns 0 when no reduction', () => {
    expect(calcReductionPct(1000, 1000)).toBe(0);
  });
  it('returns 0 for zero original', () => {
    expect(calcReductionPct(0, 0)).toBe(0);
  });
  it('returns 100 for fully empty output', () => {
    expect(calcReductionPct(1000, 0)).toBe(100);
  });
  it('handles rounding', () => {
    expect(calcReductionPct(3, 1)).toBe(67); // 66.666... rounds to 67
  });
});
