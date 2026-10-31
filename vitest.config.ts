import { defineConfig, defaultExclude } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    include: process.env.VITEST_INCLUDE ? [process.env.VITEST_INCLUDE] : ['tests/**/*.test.ts'],
    exclude: process.env.VITEST_INCLUDE ? [] : [...defaultExclude, 'tests/e2e-*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
