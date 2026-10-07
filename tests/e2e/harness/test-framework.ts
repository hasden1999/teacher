/**
 * Universal BDD Test Framework for E2E Suite
 * Supports both standalone Node execution (via runner.ts) and Vitest.
 */

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  status?: 'passed' | 'failed' | 'skipped';
  error?: Error;
  durationMs?: number;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEachHooks: (() => void | Promise<void>)[];
  afterEachHooks: (() => void | Promise<void>)[];
  beforeAllHooks: (() => void | Promise<void>)[];
  afterAllHooks: (() => void | Promise<void>)[];
}

class TestRegistry {
  suites: TestSuite[] = [];
  currentSuite: TestSuite | null = null;

  registerSuite(name: string, fn: () => void) {
    const suite: TestSuite = {
      name,
      tests: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      beforeAllHooks: [],
      afterAllHooks: [],
    };
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    this.suites.push(suite);
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  registerTest(name: string, fn: () => void | Promise<void>) {
    if (!this.currentSuite) {
      this.registerSuite('Default Suite', () => {});
    }
    this.currentSuite!.tests.push({
      name,
      fn,
    });
  }

  registerBeforeEach(fn: () => void | Promise<void>) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachHooks.push(fn);
    }
  }

  registerAfterEach(fn: () => void | Promise<void>) {
    if (this.currentSuite) {
      this.currentSuite.afterEachHooks.push(fn);
    }
  }

  registerBeforeAll(fn: () => void | Promise<void>) {
    if (this.currentSuite) {
      this.currentSuite.beforeAllHooks.push(fn);
    }
  }

  registerAfterAll(fn: () => void | Promise<void>) {
    if (this.currentSuite) {
      this.currentSuite.afterAllHooks.push(fn);
    }
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
  }
}

export const registry = new TestRegistry();

export function describe(name: string, fn: () => void) {
  registry.registerSuite(name, fn);
}

export function it(name: string, fn: () => void | Promise<void>) {
  registry.registerTest(name, fn);
}

export const test = it;

export function beforeEach(fn: () => void | Promise<void>) {
  registry.registerBeforeEach(fn);
}

export function afterEach(fn: () => void | Promise<void>) {
  registry.registerAfterEach(fn);
}

export function beforeAll(fn: () => void | Promise<void>) {
  registry.registerBeforeAll(fn);
}

export function afterAll(fn: () => void | Promise<void>) {
  registry.registerAfterAll(fn);
}

export class ExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpectationError';
  }
}

export interface Matchers<T> {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toContain(item: unknown): void;
  toHaveLength(length: number): void;
  toMatch(pattern: RegExp | string): void;
  toThrow(expectedError?: string | RegExp | Function): void;
  not: Matchers<T>;
  resolves: Matchers<T>;
  rejects: Matchers<T>;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function expect<T = any>(actual: T): Matchers<T> {
  const createMatchers = (isNot: boolean, isAsyncResolves = false, isAsyncRejects = false): Matchers<T> => {
    const handleAssert = (passed: boolean, msg: string) => {
      const condition = isNot ? !passed : passed;
      if (!condition) {
        throw new ExpectationError(msg);
      }
    };

    return {
      toBe(expected: unknown) {
        const passed = Object.is(actual, expected);
        handleAssert(passed, `Expected ${JSON.stringify(actual)} ${isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`);
      },
      toEqual(expected: unknown) {
        const passed = deepEqual(actual, expected);
        handleAssert(passed, `Expected ${JSON.stringify(actual)} ${isNot ? 'not to deeply equal' : 'to deeply equal'} ${JSON.stringify(expected)}`);
      },
      toBeCloseTo(expected: number, precision: number = 2) {
        const diff = Math.abs(Number(actual) - expected);
        const tolerance = Math.pow(10, -precision) / 2;
        const passed = diff < tolerance;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be close to' : 'to be close to'} ${expected} within tolerance ${tolerance}`);
      },
      toBeGreaterThan(expected: number) {
        const passed = (actual as any) > expected;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be >' : 'to be >'} ${expected}`);
      },
      toBeGreaterThanOrEqual(expected: number) {
        const passed = (actual as any) >= expected;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be >=' : 'to be >='} ${expected}`);
      },
      toBeLessThan(expected: number) {
        const passed = (actual as any) < expected;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be <' : 'to be <'} ${expected}`);
      },
      toBeLessThanOrEqual(expected: number) {
        const passed = (actual as any) <= expected;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be <=' : 'to be <='} ${expected}`);
      },
      toBeTruthy() {
        const passed = Boolean(actual);
        handleAssert(passed, `Expected ${actual} ${isNot ? 'to be falsy' : 'to be truthy'}`);
      },
      toBeFalsy() {
        const passed = !Boolean(actual);
        handleAssert(passed, `Expected ${actual} ${isNot ? 'to be truthy' : 'to be falsy'}`);
      },
      toBeNull() {
        const passed = actual === null;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be null' : 'to be null'}`);
      },
      toBeUndefined() {
        const passed = actual === undefined;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'not to be undefined' : 'to be undefined'}`);
      },
      toBeDefined() {
        const passed = actual !== undefined;
        handleAssert(passed, `Expected ${actual} ${isNot ? 'to be undefined' : 'to be defined'}`);
      },
      toContain(item: unknown) {
        let passed = false;
        if (typeof actual === 'string') {
          passed = actual.includes(String(item));
        } else if (Array.isArray(actual)) {
          passed = actual.some(x => deepEqual(x, item));
        }
        handleAssert(passed, `Expected ${JSON.stringify(actual)} ${isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(item)}`);
      },
      toHaveLength(length: number) {
        const actualLength = (actual as any)?.length;
        const passed = actualLength === length;
        handleAssert(passed, `Expected length ${actualLength} ${isNot ? 'not to be' : 'to be'} ${length}`);
      },
      toMatch(pattern: RegExp | string) {
        const str = String(actual);
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const passed = regex.test(str);
        handleAssert(passed, `Expected "${str}" ${isNot ? 'not to match' : 'to match'} ${pattern}`);
      },
      toThrow(expectedError?: string | RegExp | Function) {
        let threw = false;
        let thrownError: any = null;
        try {
          if (typeof actual === 'function') {
            (actual as Function)();
          }
        } catch (e) {
          threw = true;
          thrownError = e;
        }

        if (isNot) {
          if (threw) {
            throw new ExpectationError(`Expected function not to throw, but it threw: ${thrownError?.message}`);
          }
          return;
        }

        if (!threw) {
          throw new ExpectationError('Expected function to throw, but it did not throw');
        }

        if (expectedError) {
          if (typeof expectedError === 'function') {
            const matchesClass =
              thrownError instanceof expectedError ||
              thrownError?.name === (expectedError as any).name ||
              thrownError?.constructor?.name === (expectedError as any).name;
            if (!matchesClass) {
              throw new ExpectationError(
                `Expected error to be instance of ${(expectedError as any).name}, but got ${
                  thrownError?.constructor?.name || thrownError?.name || thrownError
                }`
              );
            }
          } else {
            const msg = thrownError?.message || String(thrownError);
            const matches = typeof expectedError === 'string' ? msg.includes(expectedError) : expectedError.test(msg);
            if (!matches) {
              throw new ExpectationError(`Expected error message "${msg}" to match ${expectedError}`);
            }
          }
        }
      },
      get not() {
        return createMatchers(!isNot, isAsyncResolves, isAsyncRejects);
      },
      get resolves() {
        // Simple synchronous wrapper for resolved promises when awaited
        return createMatchers(isNot, true, false);
      },
      get rejects() {
        return createMatchers(isNot, false, true);
      },
    };
  };

  return createMatchers(false);
}
