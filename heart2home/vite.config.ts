import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/dist/',
  optimizeDeps: {
    exclude: ['fsevents'],   // 👈 ignore macOS-only dep
  },
  build: {
    rollupOptions: {
      external: ['fsevents'], // 👈 don’t try to bundle it
    },
  },
})
