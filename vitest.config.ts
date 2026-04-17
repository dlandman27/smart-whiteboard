import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      './vitest.client.config.ts',
      './vitest.server.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/test/**',
        'server/test/**',
        'server/**/*.test.ts',
        'src/vite-env.d.ts',
      ],
    },
  },
})
