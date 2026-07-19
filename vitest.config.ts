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
      include: [
        'src/lib/network/**/*.ts',
        'src/lib/utils.ts',
      ],
      exclude: [
        'src/lib/network/types.ts',
        'src/lib/network/core/stubCommandHints.ts',
        'src/lib/network/core/routerConfigCommands.ts',
        'src/lib/network/core/interfaceCommands.ts',
        'src/lib/network/core/configBuilder.ts',
        'src/lib/network/core/showCommands.ts',
        'src/lib/network/core/showHelpers.ts',
        'src/lib/network/core/showInterfaceDisplay.ts',
        'src/lib/network/core/showRoutingDisplay.ts',
        'src/lib/network/core/showSwitchingDisplay.ts',
        'src/lib/network/core/showWlcDisplay.ts',
        'src/lib/network/core/systemCommands.ts',
        'src/lib/network/core/wirelessCommands.ts',
        'src/lib/network/core/lineCommands.ts',
        'src/lib/network/core/privilegedCommands.ts',
        'src/lib/network/core/globalConfigCommands.ts',
        'src/lib/network/core/dhcpConfigCommands.ts',
        'src/lib/network/core/cryptoCommands.ts',
        'src/lib/network/core/firewallCommands.ts',
        'src/lib/network/examples/',
        'src/tests/**',
      ],
      thresholds: {
        statements: 45,
        branches: 35,
        functions: 50,
        lines: 45,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
