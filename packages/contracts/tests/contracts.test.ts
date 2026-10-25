import { describe, it, expect } from 'vitest';
import {
  assertValidThinkingLevel,
  rescaleBox2dToPixels,
  computeSyncIndicatorStatus,
  DEFAULT_MONTHLY_AI_QUOTA,
} from '../src/index.js';

describe('@techeeer/contracts', () => {
  it('enforces valid Gemini 3.8 Flash thinking levels and forbids minimal', () => {
    expect(() => assertValidThinkingLevel('low')).not.toThrow();
    expect(() => assertValidThinkingLevel('medium')).not.toThrow();
    expect(() => assertValidThinkingLevel('high')).not.toThrow();
    expect(() => assertValidThinkingLevel('minimal')).toThrow(/minimal/);
  });

  it('rescales 0..1000 box_2d coordinates to pixel dimensions accurately', () => {
    const rect = rescaleBox2dToPixels([100, 200, 600, 700], 1600, 1200);
    expect(rect).toEqual({
      x: 320,
      y: 120,
      width: 800,
      height: 600,
    });
  });

  it('computes sync status indicator colors (green, amber >=3d, red >=7d)', () => {
    const now = 1_700_000_000_000;
    const dayMs = 86_400_000;

    expect(computeSyncIndicatorStatus(0, null, now).color).toBe('green');
    expect(computeSyncIndicatorStatus(2, now - 1 * dayMs, now).color).toBe('green');
    expect(computeSyncIndicatorStatus(5, now - 4 * dayMs, now).color).toBe('amber');
    expect(computeSyncIndicatorStatus(9, now - 8 * dayMs, now).color).toBe('red');
  });

  it('defines default monthly AI quota of $0.50 (500,000 micro-USD) and feature caps', () => {
    expect(DEFAULT_MONTHLY_AI_QUOTA.monthlyCostCapMicroUsd).toBe(500_000);
    expect(DEFAULT_MONTHLY_AI_QUOTA.featureCountCaps.voice_grades_segments).toBe(30);
    expect(DEFAULT_MONTHLY_AI_QUOTA.featureCountCaps.register_import).toBe(4);
  });
});
