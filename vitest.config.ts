import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/lib/network/**/*.ts'],
      exclude: [
        'src/lib/network/types.ts',
        'src/lib/network/core/stubCommandHints.ts',
        'src/tests/**',
      ],
      thresholds: {
        statements: 10,
        branches: 5,
        functions: 10,
        lines: 10,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
