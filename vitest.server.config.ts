import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    globals: true,
    include: ['server/**/*.test.ts'],
    setupFiles: ['server/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage-server',
      all: true,
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.test.ts', 'server/test/**', 'server/index.ts'],
    },
  },
})
