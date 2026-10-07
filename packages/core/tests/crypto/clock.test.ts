import { describe, it, expect } from 'vitest';
import {
  AntiTamperClock,
  verifyClockSanity,
  updateHighWaterMark
} from '../../src/crypto/clock.js';

describe('clock.ts - Anti-Tamper Clock Engine', () => {
  it('should track monotonic time progression forward and update HWM', () => {
    const clock = new AntiTamperClock(1000);
    expect(clock.getHighWaterMark()).toBeGreaterThanOrEqual(1000);

    const check1 = clock.verifyClock(2000, 100);
    expect(check1.valid).toBe(true);
    expect(check1.tampered).toBe(false);
    expect(check1.currentHwm).toBe(2000);

    const check2 = clock.verifyClock(3000, 200);
    expect(check2.valid).toBe(true);
    expect(check2.currentHwm).toBe(3000);
  });

  it('should detect clock rewind attack beyond tolerance threshold', () => {
    const clock = new AntiTamperClock(1_000_000, { toleranceMs: 60_000 });

    // Time rewound to 800,000 (200,000ms back > 60,000ms tolerance)
    const result = clock.verifyClock(800_000, 100);

    expect(result.valid).toBe(false);
    expect(result.tampered).toBe(true);
    expect(result.reason).toBe('CLOCK_REWIND');
    expect(clock.isTampered()).toBe(true);
  });

  it('should allow slight backward adjustment within tolerance window', () => {
    const clock = new AntiTamperClock(1_000_000, { toleranceMs: 60_000 });

    // Time slightly behind (970,000 is 30,000ms back <= 60,000ms tolerance)
    const result = clock.verifyClock(970_000, 100);

    expect(result.valid).toBe(true);
    expect(result.tampered).toBe(false);
  });

  it('should detect intra-session jump when wall clock drifts from monotonic performance clock', () => {
    const clock = new AntiTamperClock(0, {
      toleranceMs: 60_000,
      sessionDriftThresholdMs: 5_000
    });

    // Reset session at fixed anchor
    clock.resetSession(10_000, 100);

    // Performance timer advanced by 1,000ms (100 -> 1,100)
    // But wall clock jumped by 20,000ms (10,000 -> 30,000)
    // Drift = |20,000 - 1,000| = 19,000ms > 5,000ms
    const result = clock.verifyClock(30_000, 1_100);

    expect(result.valid).toBe(false);
    expect(result.tampered).toBe(true);
    expect(result.reason).toBe('INTRA_SESSION_JUMP');
  });

  it('should detect intra-session negative drift jump', () => {
    const clock = new AntiTamperClock(0, {
      toleranceMs: 60_000,
      sessionDriftThresholdMs: 5_000
    });

    clock.resetSession(20_000, 100);

    // Performance timer advanced by 1,000ms (100 -> 1,100)
    // Wall clock only advanced 10ms or went back slightly (within tolerance of HWM but drifting from perf)
    // DeltaWall = 10ms, DeltaPerf = 10,000ms -> drift = 9,990ms > 5,000ms
    const result = clock.verifyClock(20_010, 10_100);

    expect(result.valid).toBe(false);
    expect(result.tampered).toBe(true);
    expect(result.reason).toBe('INTRA_SESSION_JUMP');
  });

  it('should recover from rewind tamper when clock is corrected back to >= HWM', () => {
    const clock = new AntiTamperClock(1_000_000, { toleranceMs: 60_000 });

    // Step 1: Trigger rewind
    const check1 = clock.verifyClock(800_000, 100);
    expect(check1.tampered).toBe(true);

    // Step 2: System clock is corrected to 1,000,500
    const check2 = clock.verifyClock(1_000_500, 200);
    expect(check2.valid).toBe(true);
    expect(check2.tampered).toBe(false);
    expect(clock.isTampered()).toBe(false);
  });

  it('should record activity and update high water mark', () => {
    const clock = new AntiTamperClock(500);
    const newHwm = clock.recordActivity(1500);
    expect(newHwm).toBe(1500);
    expect(clock.getHighWaterMark()).toBe(1500);

    // Activity with lower timestamp does not reduce HWM
    const lowerHwm = clock.recordActivity(1200);
    expect(lowerHwm).toBe(1500);
  });

  it('should detect tamper at startup if initial HWM exceeds current wall time', () => {
    // Current time is roughly Date.now(). If HWM is far in future:
    const futureHwm = Date.now() + 10_000_000;
    const clock = new AntiTamperClock(futureHwm);

    expect(clock.isTampered()).toBe(true);
  });

  it('should support helper functions verifyClockSanity and updateHighWaterMark', () => {
    const now = Date.now();
    const sanityCheck = verifyClockSanity(now, now - 1000);
    expect(sanityCheck.valid).toBe(true);

    const sanityFail = verifyClockSanity(1000, 1_000_000);
    expect(sanityFail.valid).toBe(false);

    expect(updateHighWaterMark(1000, 2000)).toBe(2000);
    expect(updateHighWaterMark(3000, 2000)).toBe(3000);
  });

  it('should handle resetSession with modern timestamps greater than and less than highWaterMark', () => {
    const clock = new AntiTamperClock(1_700_000_000_000);
    expect(clock.getHighWaterMark()).toBe(1_700_000_000_000);

    // Case 1: wallTime > 1_000_000_000_000 and wallTime > highWaterMark
    clock.resetSession(1_700_000_500_000, 50);
    expect(clock.getHighWaterMark()).toBe(1_700_000_500_000);

    // Case 2: wallTime > 1_000_000_000_000 and wallTime <= highWaterMark
    clock.resetSession(1_700_000_400_000, 60);
    expect(clock.getHighWaterMark()).toBe(1_700_000_500_000);
  });
});
