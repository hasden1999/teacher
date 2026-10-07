import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tier*.test.ts'],
    testTimeout: 15000,
  },
});
