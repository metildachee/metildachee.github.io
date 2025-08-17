import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/',
  resolve: {
    alias: {
      fs: false,
      path: false,
      os: false,
      module: false,
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
  },
  build: {
    rollupOptions: {
      external: ['fsevents'],
    },
  },
})
