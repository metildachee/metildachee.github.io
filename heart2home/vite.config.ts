import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/',  // Critical for subdirectory deployment
  build: {
    outDir: '../dist-heart2home',  // Build outside project dir
    emptyOutDir: true,
  }
})