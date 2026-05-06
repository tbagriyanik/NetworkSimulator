# UI/UX Type Definitions

This directory contains all TypeScript type definitions for the Network Simulator UI/UX improvements.

## Files

### index.ts
Main type definitions file containing:

- **Device Types**: `DeviceType`, `DeviceStatus`, `ConnectionType`, `ConnectionStatus`, `LearningMode`, `AchievementCategory`

- **Core Interfaces**:
  - `DeviceConfig` - Complete device configuration with network settings and UI state
  - `Port` - Device port configuration
  - `Connection` - Network connection between devices
  - `NetworkState` - Complete network state with devices, connections, and metadata
  - `Achievement` - Achievement/badge definition
  - `StudentProgress` - Student progress tracking

- **Design System Interfaces**:
  - `ResponsiveBreakpoint` - Responsive design breakpoints
  - `ColorPalette` - Color definitions
  - `TypographyScale` - Typography definitions
  - `UIUXConfig` - Complete UI/UX configuration

- **Feature Interfaces**:
  - `GuidedModeStep` - Guided mode step definition
  - `TooltipContent` - Tooltip content structure
  - `ErrorContext` - Error context and suggestions

## Usage

```typescript
import type { DeviceConfig, NetworkState, Achievement } from '@/types/ui-ux';

const device: DeviceConfig = {
  id: 'device-1',
  type: 'pc',
  name: 'My PC',
  position: { x: 100, y: 100 },
  status: 'online',
  network: {
    ipv4: '192.168.1.10',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
  },
  isSelected: false,
  isHighlighted: false,
};
```

## Design Principles

- **Type Safety**: All types are strictly defined with no `any` types
- **Extensibility**: Interfaces use optional properties for future expansion
- **Clarity**: Clear naming and documentation for all types
- **Consistency**: Aligned with design document specifications
