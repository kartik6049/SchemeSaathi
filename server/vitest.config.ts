import { defineConfig } from 'vitest/config';

// Integration tests share one Postgres test database, so files run serially.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setupEnv.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/seed/**', 'src/db/migrate.ts'],
      reporter: ['text', 'html'],
    },
  },
});
