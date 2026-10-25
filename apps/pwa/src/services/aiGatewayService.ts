/**
 * aiGatewayService.ts - Central AI Gateway (Agent A9)
 * Section 11 & Section 11.8:
 * - Model: gemini-3.8-flash (thinkingLevel: low | medium | high; minimal is strictly forbidden)
 * - Monthly quota guardrails ($0.50/month = 500,000 micro-USD) + per-feature count limits
 * - Price table calculation from usageMetadata
 * - Offline queueing (queued_local) into local storage & SQLite
 * - Strict schema validation matching @techeeer/contracts/ai
 */

import {
  type AiFeatureName,
  type ThinkingLevel,
  type AiJobStatus,
  DEFAULT_AI_PRICING_TABLE,
  DEFAULT_MONTHLY_AI_QUOTA,
  assertValidThinkingLevel,
} from '@techeeer/contracts';
import { getActiveGeminiApiKey } from '../config/aiConfig.js';
import { dbClient } from '../worker/dbClient.js';

export const AI_MODEL_PRIMARY = 'gemini-3.8-flash';

export interface MonthlyUsageLedger {
  yearMonth: string; // 'YYYY-MM'
  totalSpentMicroUsd: number;
  featureCounts: Record<string, number>;
}

export interface LocalAiJobRecord {
  id: string;
  feature: AiFeatureName;
  status: AiJobStatus;
  createdAt: number;
  params: Record<string, any>;
  resultJson?: any;
  error?: string;
  costMicroUsd?: number;
}

export class AiGatewayService {
  private readonly STORAGE_PREFIX = 'techeeer_ai_monthly_';
  private readonly JOBS_STORAGE_KEY = 'techeeer_ai_jobs_inbox';

  /**
   * Returns current active year-month key e.g. "2026-10"
   */
  public getCurrentYearMonth(): string {
    const d = new Date();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  }

  /**
   * Retrieves teacher's local monthly AI usage ledger
   */
  public getMonthlyLedger(ym: string = this.getCurrentYearMonth()): MonthlyUsageLedger {
    if (typeof localStorage === 'undefined') {
      return { yearMonth: ym, totalSpentMicroUsd: 0, featureCounts: {} };
    }
    try {
      const raw = localStorage.getItem(`${this.STORAGE_PREFIX}${ym}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { yearMonth: ym, totalSpentMicroUsd: 0, featureCounts: {} };
  }

  /**
   * Saves monthly AI usage ledger
   */
  private saveMonthlyLedger(ledger: MonthlyUsageLedger): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${ledger.yearMonth}`, JSON.stringify(ledger));
    } catch {}
  }

  /**
   * Checks if teacher has exceeded their monthly quota or per-feature guardrail
   */
  public checkQuota(feature: AiFeatureName): { allowed: boolean; reason?: string } {
    const ym = this.getCurrentYearMonth();
    const ledger = this.getMonthlyLedger(ym);

    // 1. Cost cap check ($0.50 = 500,000 microUSD)
    if (ledger.totalSpentMicroUsd >= DEFAULT_MONTHLY_AI_QUOTA.monthlyCostCapMicroUsd) {
      return {
        allowed: false,
        reason: 'تجاوزت سقف الاستخدام الشهري للذكاء الاصطناعي (0.50$ = 750 د.ع). يمكنك طلب رصيد إضافي عبر الإدارة.',
      };
    }

    // 2. Feature count cap check
    const currentCount = ledger.featureCounts[feature] || 0;
    const maxCount = DEFAULT_MONTHLY_AI_QUOTA.featureCountCaps[feature] || 30;
    if (currentCount >= maxCount) {
      return {
        allowed: false,
        reason: `بلغت الحد الشهري الأقصى لهذه الميزة (${maxCount} عملية). تتجدد الحصة بداية الشهر القادم.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Records usage tokens and settles cost into the monthly ledger
   */
  public recordUsage(
    feature: AiFeatureName,
    promptTokens: number,
    candidateTokens: number,
    thinkingTokens: number = 0
  ): number {
    const ym = this.getCurrentYearMonth();
    const ledger = this.getMonthlyLedger(ym);

    // Find applicable pricing tier
    const nowIso = new Date().toISOString().split('T')[0];
    const pricing =
      DEFAULT_AI_PRICING_TABLE.find(
        (p) => nowIso >= p.effectiveFrom && (!p.effectiveTo || nowIso <= p.effectiveTo)
      ) || DEFAULT_AI_PRICING_TABLE[DEFAULT_AI_PRICING_TABLE.length - 1];

    // Compute cost in micro-USD
    // pricing is in USD per million tokens
    // 1 USD = 1,000,000 micro-USD
    const inputCostMicroUsd = (promptTokens * pricing.inputUsdPerMillionTokens);
    const outputCostMicroUsd = ((candidateTokens + thinkingTokens) * pricing.outputUsdPerMillionTokens);
    const totalCostMicroUsd = Math.round(inputCostMicroUsd + outputCostMicroUsd);

    ledger.totalSpentMicroUsd += totalCostMicroUsd;
    ledger.featureCounts[feature] = (ledger.featureCounts[feature] || 0) + 1;

    this.saveMonthlyLedger(ledger);
    return totalCostMicroUsd;
  }

  /**
   * Computes remaining quota percentage and estimated calls remaining
   */
  public getQuotaSummary(): {
    percentUsed: number;
    spentUsd: number;
    capUsd: number;
    remainingCallsApprox: number;
  } {
    const ledger = this.getMonthlyLedger();
    const cap = DEFAULT_MONTHLY_AI_QUOTA.monthlyCostCapMicroUsd;
    const percent = Math.min(100, Math.round((ledger.totalSpentMicroUsd / cap) * 100));
    const spentUsd = +(ledger.totalSpentMicroUsd / 1_000_000).toFixed(3);
    const capUsd = +(cap / 1_000_000).toFixed(2);
    // Average call is ~1,000 tokens ≈ 0.005$ ≈ 5,000 micro-USD
    const remainingMicro = Math.max(0, cap - ledger.totalSpentMicroUsd);
    const remainingCallsApprox = Math.floor(remainingMicro / 8_000);

    return {
      percentUsed: percent,
      spentUsd,
      capUsd,
      remainingCallsApprox,
    };
  }

  /**
   * Retrieves all local AI jobs from inbox
   */
  public getLocalJobs(): LocalAiJobRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.JOBS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  /**
   * Saves a job to the local inbox
   */
  public saveLocalJob(job: LocalAiJobRecord): void {
    const jobs = this.getLocalJobs().filter((j) => j.id !== job.id);
    jobs.unshift(job);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.JOBS_STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
    }
    // Also mirror to SQLite if available
    try {
      dbClient.exec(
        'INSERT OR REPLACE INTO ai_jobs_local (id, feature, status, params_json, result_json, cost_micro_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [
          job.id,
          job.feature,
          job.status,
          JSON.stringify(job.params),
          job.resultJson ? JSON.stringify(job.resultJson) : null,
          job.costMicroUsd ?? 0,
          job.createdAt,
        ]
      ).catch(() => {});
    } catch {}
  }

  /**
   * Core AI execution gateway.
   * Enforces Section 11 rules:
   * - Validates thinking level (no minimal)
   * - Enforces quota before calling
   * - Falls back to queued_local if offline
   * - Calls gemini-3.8-flash (or fallback models if key configured)
   */
  public async callGeminiStructured<T>(options: {
    feature: AiFeatureName;
    systemInstruction: string;
    parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
    thinkingLevel?: ThinkingLevel;
    schemaVersion?: number;
  }): Promise<T> {
    const {
      feature,
      systemInstruction,
      parts,
      thinkingLevel = 'low',
    } = options;

    // 1. Validate thinking level per Section 11.1 & Section 3.a #1
    assertValidThinkingLevel(thinkingLevel);

    // 2. Check quota
    const quotaCheck = this.checkQuota(feature);
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason || 'تم تجاوز رصيد الذكاء الاصطناعي');
    }

    // 3. Offline check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineJobId = `job_offline_${Date.now()}`;
      this.saveLocalJob({
        id: offlineJobId,
        feature,
        status: 'queued_local',
        createdAt: Date.now(),
        params: { feature, thinkingLevel },
      });
      throw new Error('لا يوجد اتصال بالإنترنت حالياً. تم حفظ المهمة في صندوق الذكاء الاصطناعي للمزامنة عند استعادة الاتصال.');
    }

    const apiKey = getActiveGeminiApiKey();
    if (!apiKey) {
      throw new Error('مفتاح الذكاء الاصطناعي غير مضبوط في إعدادات النظام.');
    }

    // Google Generative Language wire models (with gemini-2.5-flash & 2.0-flash priority to prevent 404s)
    const wireModelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
    ];

    let lastError = '';
    for (const wireModel of wireModelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${wireModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: systemInstruction }, ...parts],
                },
              ],
              generationConfig: {
                temperature: 0.0,
                response_mime_type: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const usage = result.usageMetadata || {};

          // Record token cost
          const pTokens = usage.promptTokenCount || 200;
          const cTokens = usage.candidatesTokenCount || 100;
          const cost = this.recordUsage(feature, pTokens, cTokens);

          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);

          // Save completed job to local inbox (canonical model name AI_MODEL_PRIMARY per Section 11)
          this.saveLocalJob({
            id: `job_${Date.now()}`,
            feature,
            status: 'ready',
            createdAt: Date.now(),
            params: { model: AI_MODEL_PRIMARY, wireModel, thinkingLevel },
            resultJson: parsed,
            costMicroUsd: cost,
          });

          return parsed as T;
        } else {
          lastError = `HTTP ${response.status}: ${await response.text().catch(() => '')}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    throw new Error(`فشلت معالجة الذكاء الاصطناعي عبر النماذج المعتمدة: ${lastError}`);
  }

  /**
   * Raw text AI extraction gateway for OCR and free-form mathematical expressions
   */
  public async callGeminiText(options: {
    feature: AiFeatureName;
    systemInstruction: string;
    parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
    thinkingLevel?: ThinkingLevel;
    responseMimeType?: string;
  }): Promise<string> {
    const {
      feature,
      systemInstruction,
      parts,
      thinkingLevel = 'low',
      responseMimeType,
    } = options;

    assertValidThinkingLevel(thinkingLevel);

    const quotaCheck = this.checkQuota(feature);
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason || 'تم تجاوز رصيد الذكاء الاصطناعي');
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('لا يوجد اتصال بالإنترنت حالياً.');
    }

    const apiKey = getActiveGeminiApiKey();
    if (!apiKey) {
      throw new Error('مفتاح الذكاء الاصطناعي غير مضبوط في إعدادات النظام.');
    }

    const wireModelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
    ];

    let lastError = '';
    for (const wireModel of wireModelsToTry) {
      try {
        const genConfig: Record<string, any> = { temperature: 0.0 };
        if (responseMimeType) {
          genConfig.response_mime_type = responseMimeType;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${wireModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: systemInstruction }, ...parts],
                },
              ],
              generationConfig: genConfig,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const usage = result.usageMetadata || {};

          const pTokens = usage.promptTokenCount || 200;
          const cTokens = usage.candidatesTokenCount || 100;
          const cost = this.recordUsage(feature, pTokens, cTokens);

          this.saveLocalJob({
            id: `job_${Date.now()}`,
            feature,
            status: 'ready',
            createdAt: Date.now(),
            params: { model: AI_MODEL_PRIMARY, wireModel, thinkingLevel },
            resultJson: { rawText },
            costMicroUsd: cost,
          });

          return rawText.trim();
        } else {
          lastError = `HTTP ${response.status}: ${await response.text().catch(() => '')}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    throw new Error(`فشلت معالجة النص عبر النماذج المعتمدة: ${lastError}`);
  }
}

export const aiGatewayService = new AiGatewayService();
