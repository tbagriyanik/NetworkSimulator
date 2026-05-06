# UI/UX Test Utilities and Tests

This directory contains test utilities and test files for the Network Simulator UI/UX improvements.

## Files

### test-utils.ts
Comprehensive test utilities providing:

- **Mock Creators**:
  - `createMockDevice()` - Create mock device configurations
  - `createMockConnection()` - Create mock connections
  - `createMockNetworkState()` - Create mock network states
  - `createMockAchievement()` - Create mock achievements
  - `createMockStudentProgress()` - Create mock student progress

- **Validation Functions**:
  - `isValidIPv4()` - Validate IPv4 addresses
  - `isValidSubnetMask()` - Validate subnet masks
  - `isValidGateway()` - Validate gateway addresses
  - `isValidDNS()` - Validate DNS servers
  - `isValidMACAddress()` - Validate MAC addresses
  - `isValidDeviceName()` - Validate device names

- **ID Generators**:
  - `generateDeviceId()` - Generate unique device IDs
  - `generateConnectionId()` - Generate unique connection IDs
  - `generateAchievementId()` - Generate unique achievement IDs

- **XP and Level Functions**:
  - `calculateXPForLevel()` - Get XP threshold for a level
  - `getLevelFromXP()` - Get level from total XP
  - `getXPProgressToNextLevel()` - Get progress to next level

- **Serialization Functions**:
  - `serializeNetworkState()` - Convert network state to JSON
  - `deserializeNetworkState()` - Parse JSON to network state

- **Device Placement Functions**:
  - `isDeviceInBounds()` - Check if device is within canvas bounds
  - `devicesOverlap()` - Check if two devices overlap

- **Query Functions**:
  - `getDevicesByType()` - Get devices of a specific type
  - `getConnectionsForDevice()` - Get connections for a device
  - `isValidConnection()` - Validate a connection

### types.test.ts
Tests for type definitions:
- DeviceConfig structure and properties
- Connection types and properties
- NetworkState structure
- Achievement structure
- StudentProgress tracking

**Test Count**: 13 tests

### constants.test.ts
Tests for design system constants:
- Color palette definitions
- Typography scale
- Responsive breakpoints
- Spacing scale
- Animation durations
- Device type colors
- Mode features
- Achievement categories
- XP thresholds and rewards
- Accessibility constants
- Validation rules

**Test Count**: 42 tests

### test-utils.test.ts
Tests for test utility functions:
- Mock creator functions
- Validation functions (IPv4, subnet, gateway, DNS, MAC, device name)
- ID generators
- XP and level calculations
- Serialization round-trip
- Device placement checks
- Device and connection queries

**Test Count**: 26 tests

## Running Tests

```bash
# Run all UI/UX tests
npm test -- src/tests/ui-ux/ --run

# Run tests in watch mode
npm test -- src/tests/ui-ux/

# Run specific test file
npm test -- src/tests/ui-ux/types.test.ts --run
```

## Test Coverage

- **Total Tests**: 81
- **All Passing**: ✓

## Usage in Tests

```typescript
import { createMockDevice, isValidIPv4 } from '@/tests/ui-ux/test-utils';

describe('My Component', () => {
  it('should handle device configuration', () => {
    const device = createMockDevice({
      name: 'Test Device',
      type: 'router',
    });
    
    expect(device.name).toBe('Test Device');
    expect(device.type).toBe('router');
  });

  it('should validate IP addresses', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('invalid')).toBe(false);
  });
});
```

## Design Principles

- **Comprehensive**: Covers all core functionality
- **Reusable**: Mock creators and validators can be used across all tests
- **Maintainable**: Well-organized and documented
- **Extensible**: Easy to add new test utilities as needed
