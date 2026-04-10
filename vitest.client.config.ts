import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@whiteboard/sdk':    path.resolve(__dirname, 'src/sdk/index.ts'),
      '@whiteboard/ui-kit': path.resolve(__dirname, 'packages/ui-kit/src/index.ts'),
    },
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
