import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      'src-electron': resolve(__dirname, 'src-electron'),
      src: resolve(__dirname, 'src'),
    },
  },
})
