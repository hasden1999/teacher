import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@techeeer/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@techeeer/content': path.resolve(__dirname, '../../packages/content/src/index.ts'),
      '@techeeer/grading-engine': path.resolve(__dirname, '../../packages/grading-engine/src/index.ts'),
      '@techeeer/arabic-utils': path.resolve(__dirname, '../../packages/arabic-utils/src/index.ts'),
      '@techeeer/math-tools': path.resolve(__dirname, '../../packages/math-tools/src/index.ts'),
      '@techeeer/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/index.ts',
        'src/**/types.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
