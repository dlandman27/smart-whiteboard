import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    globals: true,
    include: ['server/**/*.test.ts'],
    setupFiles: ['server/test/setup.ts'],
  },
})
