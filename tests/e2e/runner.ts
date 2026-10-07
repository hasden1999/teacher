/**
 * Universal E2E Test Suite Runner for "مساعد المعلم"
 * Executes Tier 1, Tier 2, Tier 3, and Tier 4 test suites.
 */

import { registry } from './harness/test-framework.ts';
import type { TestSuite } from './harness/test-framework.ts';

interface RunResult {
  tierName: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: Array<{ suite: string; test: string; error: Error }>;
}

async function runSuiteList(suites: TestSuite[]): Promise<RunResult> {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  const failures: Array<{ suite: string; test: string; error: Error }> = [];
  const start = performance.now();

  for (const suite of suites) {
    // Run beforeAll hooks
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    for (const test of suite.tests) {
      totalTests++;
      const tStart = performance.now();
      try {
        // Run beforeEach hooks
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }

        await test.fn();

        // Run afterEach hooks
        for (const hook of suite.afterEachHooks) {
          await hook();
        }

        test.status = 'passed';
        test.durationMs = performance.now() - tStart;
        passed++;
      } catch (err: any) {
        test.status = 'failed';
        test.error = err;
        test.durationMs = performance.now() - tStart;
        failed++;
        failures.push({
          suite: suite.name,
          test: test.name,
          error: err,
        });
      }
    }

    // Run afterAll hooks
    for (const hook of suite.afterAllHooks) {
      await hook();
    }
  }

  const durationMs = performance.now() - start;
  return {
    tierName: '',
    totalTests,
    passed,
    failed,
    durationMs,
    failures,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(a => a.startsWith('--tier='));
  const targetTier = tierArg ? tierArg.split('=')[1] : null;

  console.log('\n===============================================================');
  console.log('  مساعد المعلم (Iraqi Teacher Assistant) - E2E TEST SUITE RUNNER  ');
  console.log('===============================================================\n');

  const tierFiles: Array<{ id: string; name: string; file: string }> = [
    { id: '1', name: 'Tier 1: Feature Coverage (R1-R6)', file: './tier1-features.test.ts' },
    { id: '2', name: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries.test.ts' },
    { id: '3', name: 'Tier 3: Pairwise Interactions', file: './tier3-interactions.test.ts' },
    { id: '4', name: 'Tier 4: Real-World Scenarios', file: './tier4-scenarios.test.ts' },
  ];

  const filtered = targetTier
    ? tierFiles.filter(t => t.id === targetTier)
    : tierFiles;

  if (filtered.length === 0) {
    console.error(`Unknown tier specified: ${targetTier}. Valid values are 1, 2, 3, 4.`);
    process.exit(1);
  }

  const allResults: RunResult[] = [];
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  const globalStart = performance.now();

  for (const tier of filtered) {
    registry.clear();
    console.log(`\n⏳ Running [${tier.name}] from ${tier.file}...`);

    try {
      // Dynamic import loads and registers tests
      await import(tier.file);
    } catch (importErr: any) {
      console.error(`❌ Failed to load ${tier.file}:`, importErr);
      process.exit(1);
    }

    const suites = [...registry.suites];
    const result = await runSuiteList(suites);
    result.tierName = tier.name;
    allResults.push(result);

    grandTotal += result.totalTests;
    grandPassed += result.passed;
    grandFailed += result.failed;

    if (result.failed === 0) {
      console.log(`  ✅ Passed all ${result.totalTests} tests in ${result.durationMs.toFixed(1)}ms`);
    } else {
      console.log(`  ❌ ${result.failed} / ${result.totalTests} tests failed in ${result.durationMs.toFixed(1)}ms`);
      for (const f of result.failures) {
        console.log(`     - [${f.suite}] > ${f.test}`);
        console.log(`       Error: ${f.error.message}`);
      }
    }
  }

  const totalTime = performance.now() - globalStart;

  console.log('\n===============================================================');
  console.log('                      E2E TEST SUMMARY REPORT                  ');
  console.log('===============================================================');
  console.log('Tier                           Total    Passed   Failed   Time (ms)');
  console.log('---------------------------------------------------------------');
  for (const r of allResults) {
    const padName = r.tierName.padEnd(30, ' ');
    const padTotal = String(r.totalTests).padStart(6, ' ');
    const padPassed = String(r.passed).padStart(8, ' ');
    const padFailed = String(r.failed).padStart(8, ' ');
    const padTime = String(r.durationMs.toFixed(1)).padStart(10, ' ');
    console.log(`${padName} ${padTotal} ${padPassed} ${padFailed} ${padTime}`);
  }
  console.log('---------------------------------------------------------------');
  const summaryStatus = grandFailed === 0 ? 'SUCCESS (ALL PASSED)' : 'FAILURE';
  console.log(`TOTAL: ${grandTotal} tests | PASSED: ${grandPassed} | FAILED: ${grandFailed} | STATUS: ${summaryStatus}`);
  console.log(`Total Execution Time: ${totalTime.toFixed(1)}ms`);
  console.log('===============================================================\n');

  if (grandFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
