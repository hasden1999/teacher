// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AiGatewayService,
  aiGatewayService,
  AI_MODEL_PRIMARY,
} from '../src/services/aiGatewayService.js';
import { DEFAULT_MONTHLY_AI_QUOTA } from '@techeeer/contracts';

describe('AiGatewayService Unit Test Suite (Section 11 & A9)', () => {
  let service: AiGatewayService;

  beforeEach(() => {
    service = new AiGatewayService();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Model & Thinking Level Enforcement', () => {
    it('uses gemini-3.8-flash as primary model', () => {
      expect(AI_MODEL_PRIMARY).toBe('gemini-3.8-flash');
    });

    it('rejects minimal thinking level with an explicit error', async () => {
      await expect(
        service.callGeminiStructured({
          feature: 'voice_grades_segments',
          systemInstruction: 'test',
          parts: [{ text: 'sample' }],
          thinkingLevel: 'minimal' as any,
        })
      ).rejects.toThrow(/Invalid thinkingLevel "minimal"/);
    });
  });

  describe('Monthly Quota & Cost Tracking', () => {
    it('initializes empty ledger with 0 spend', () => {
      const ledger = service.getMonthlyLedger('2026-10');
      expect(ledger.totalSpentMicroUsd).toBe(0);
      expect(ledger.featureCounts).toEqual({});
    });

    it('records usage and calculates cost from token usage', () => {
      // 1000 prompt tokens, 500 candidate tokens
      const costMicroUsd = service.recordUsage('voice_grades_segments', 1000, 500);
      expect(costMicroUsd).toBeGreaterThan(0);

      const ledger = service.getMonthlyLedger();
      expect(ledger.totalSpentMicroUsd).toBe(costMicroUsd);
      expect(ledger.featureCounts['voice_grades_segments']).toBe(1);
    });

    it('blocks execution when monthly budget ($0.50) is exhausted', () => {
      const ym = service.getCurrentYearMonth();
      // Simulate exhausting the 500,000 microUSD limit
      localStorage.setItem(
        `techeeer_ai_monthly_${ym}`,
        JSON.stringify({
          yearMonth: ym,
          totalSpentMicroUsd: 500_000,
          featureCounts: {},
        })
      );

      const check = service.checkQuota('voice_grades_segments');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('سقف الاستخدام الشهري');
    });

    it('blocks execution when feature count guardrail is reached', () => {
      const ym = service.getCurrentYearMonth();
      // Simulate reaching feature limit (30 voice sessions)
      localStorage.setItem(
        `techeeer_ai_monthly_${ym}`,
        JSON.stringify({
          yearMonth: ym,
          totalSpentMicroUsd: 10_000,
          featureCounts: { voice_grades_segments: 30 },
        })
      );

      const check = service.checkQuota('voice_grades_segments');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('الحد الشهري الأقصى لهذه الميزة');
    });

    it('computes accurate quota summary for UI', () => {
      const ym = service.getCurrentYearMonth();
      localStorage.setItem(
        `techeeer_ai_monthly_${ym}`,
        JSON.stringify({
          yearMonth: ym,
          totalSpentMicroUsd: 250_000, // half of $0.50
          featureCounts: { voice_grades_segments: 5 },
        })
      );

      const summary = service.getQuotaSummary();
      expect(summary.percentUsed).toBe(50);
      expect(summary.spentUsd).toBe(0.25);
      expect(summary.capUsd).toBe(0.5);
      expect(summary.remainingCallsApprox).toBeGreaterThan(0);
    });
  });

  describe('Local Jobs Inbox & Offline Handling', () => {
    it('persists and retrieves local AI jobs', () => {
      const job = {
        id: 'job_test_1',
        feature: 'voice_grades_segments' as const,
        status: 'ready' as const,
        createdAt: Date.now(),
        params: { mode: 'A1' },
        costMicroUsd: 1200,
      };

      service.saveLocalJob(job);
      const jobs = service.getLocalJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('job_test_1');
    });
  });
});
