import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/heart2home/', // Must match your subdirectory
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})