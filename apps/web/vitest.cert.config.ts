import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./certification/fixtures/setup.ts'],
    include: ['certification/**/*.test.ts'],
    testTimeout: 30000, // 30s for heavy DB operations
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
