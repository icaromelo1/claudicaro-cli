import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src-electron/__tests__/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      'src-electron': resolve(__dirname, 'src-electron'),
      src: resolve(__dirname, 'src'),
    },
  },
})
