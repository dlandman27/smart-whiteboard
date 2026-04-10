import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      './vitest.client.config.ts',
      './vitest.server.config.ts',
    ],
  },
})
