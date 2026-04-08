import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { uiKitEnforce } from './vite-plugins/ui-kit-enforce'

export default defineConfig({
  plugins: [uiKitEnforce(), react(), basicSsl()],
  resolve: {
    alias: {
      '@whiteboard/sdk':    path.resolve(__dirname, 'src/sdk/index.ts'),
      '@whiteboard/ui-kit': path.resolve(__dirname, 'packages/ui-kit/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
