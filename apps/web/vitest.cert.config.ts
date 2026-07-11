import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./certification/fixtures/setup.ts'],
    include: ['certification/**/*.test.ts'],
    testTimeout: 30000, // 30s for heavy DB operations
  },
})
