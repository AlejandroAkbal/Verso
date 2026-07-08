import { describe, expect, it } from 'vitest';

import { normalizeRemotePercentage } from './progress';

describe('normalizeRemotePercentage', () => {
  it('turns missing KOReader percentages into zero', () => {
    expect(normalizeRemotePercentage(null)).toBe(0);
    expect(normalizeRemotePercentage(undefined)).toBe(0);
    expect(normalizeRemotePercentage(Number.NaN)).toBe(0);
  });

  it('clamps remote percentages to the reader range', () => {
    expect(normalizeRemotePercentage(-0.5)).toBe(0);
    expect(normalizeRemotePercentage(0.4)).toBe(0.4);
    expect(normalizeRemotePercentage(1.5)).toBe(1);
  });
});
