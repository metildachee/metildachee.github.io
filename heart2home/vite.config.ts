import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/',

  resolve: {
    alias: {
      // Replace Node built-ins with empty modules to avoid CI build errors
      fs: path.resolve(__dirname, 'empty.js'),
      path: path.resolve(__dirname, 'empty.js'),
      os: path.resolve(__dirname, 'empty.js'),
      module: path.resolve(__dirname, 'empty.js'),
    },
  },

  optimizeDeps: {
    exclude: ['fsevents'], // macOS-only dependency, skip on CI
  },

  build: {
    rollupOptions: {
      external: ['fsevents'],
    },
  },
})
