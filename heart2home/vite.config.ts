import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodePolyfills from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  base: '/heart2home/',
  resolve: {
    alias: {
      // point to empty shims instead of "false"
      fs: 'rollup-plugin-node-builtins/mock/fs',
      path: 'rollup-plugin-node-builtins/mock/path',
      os: 'rollup-plugin-node-builtins/mock/os',
      module: 'rollup-plugin-node-builtins/mock/module',
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
