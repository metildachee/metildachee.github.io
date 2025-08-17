import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/',
  resolve: {
    alias: {
      fs: '/@empty.js',
      path: '/@empty.js',
      os: '/@empty.js',
      module: '/@empty.js',
    },
  },
})
