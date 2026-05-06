# Icon System

The Icon System provides a comprehensive set of components and utilities for consistent icon usage throughout the Network Simulator application. It uses lucide-react as the icon library and provides specialized components for device icons, action icons, and status icons.

## Overview

The icon system includes:

- **Icon Components**: Generic and specialized icon components
- **Icon Utilities**: Helper functions for icon management
- **Icon Constants**: Predefined icon names for devices, actions, and statuses
- **Icon Sizes**: Consistent sizing system (xs, sm, md, lg, xl, 2xl)
- **Accessibility**: Built-in ARIA labels and semantic HTML

## Icon Sizes

The system defines 6 standard icon sizes:

| Size | Pixels | CSS Class | Use Case |
|------|--------|-----------|----------|
| xs | 16px | w-4 h-4 | Small inline icons |
| sm | 20px | w-5 h-5 | Compact UI elements |
| md | 24px | w-6 h-6 | Standard icons (default) |
| lg | 32px | w-8 h-8 | Large icons |
| xl | 40px | w-10 h-10 | Extra large icons |
| 2xl | 48px | w-12 h-12 | Hero icons |

## Components

### Icon

Generic icon component that renders any lucide-react icon by name.

```tsx
import { Icon } from '@/components/ui';

export function MyComponent() {
  return (
    <>
      <Icon name="Plus" size="md" />
      <Icon name="Trash2" size="lg" color="#FF3333" />
      <Icon name="Settings" size={28} />
    </>
  );
}
```

**Props:**
- `name` (string, required): Lucide-react icon name
- `size` (IconSize | number, default: 'md'): Icon size
- `color` (string, optional): Icon color
- `strokeWidth` (number, default: 2): SVG stroke width
- `fill` (boolean, default: false): Whether to fill the icon
- `className` (string, optional): Additional CSS classes

### DeviceIcon

Renders device-specific icons with predefined names.

```tsx
import { DeviceIcon } from '@/components/ui';

export function DeviceList() {
  return (
    <>
      <DeviceIcon deviceType="pc" size="md" />
      <DeviceIcon deviceType="router" size="lg" />
      <DeviceIcon deviceType="switch" size="md" />
      <DeviceIcon deviceType="firewall" size="md" />
    </>
  );
}
```

**Device Types:**
- `pc`: Personal Computer
- `router`: Network Router
- `switch`: Network Switch
- `iot`: IoT Device
- `wireless`: Wireless Router
- `firewall`: Firewall
- `loadbalancer`: Load Balancer
- `server`: Server
- `database`: Database
- `cloud`: Cloud Service

### ActionIcon

Renders action-specific icons for common UI actions.

```tsx
import { ActionIcon } from '@/components/ui';

export function Toolbar() {
  return (
    <>
      <ActionIcon action="add" size="md" />
      <ActionIcon action="delete" size="md" />
      <ActionIcon action="edit" size="md" />
      <ActionIcon action="settings" size="md" />
      <ActionIcon action="help" size="md" />
    </>
  );
}
```

**Action Types:**
- `add`, `delete`, `edit`, `settings`, `help`
- `ping`, `connect`, `disconnect`, `save`, `load`
- `export`, `import`, `search`, `filter`, `sort`
- `refresh`, `close`, `menu`, `undo`, `redo`
- `zoomIn`, `zoomOut`, `maximize`, `minimize`
- And many more...

### StatusIcon

Renders status-specific icons for device and connection states.

```tsx
import { StatusIcon } from '@/components/ui';

export function DeviceStatus() {
  return (
    <>
      <StatusIcon status="online" size="md" />
      <StatusIcon status="offline" size="md" />
      <StatusIcon status="connected" size="md" />
      <StatusIcon status="disconnected" size="md" />
      <StatusIcon status="success" size="md" />
      <StatusIcon status="error" size="md" />
    </>
  );
}
```

**Status Types:**
- `online`, `offline`, `idle`, `busy`, `away`, `dnd`
- `connected`, `disconnected`, `active`, `inactive`
- `success`, `error`, `warning`, `info`, `pending`
- `loading`, `syncing`, `synced`, `failed`, `retry`

### IconButton

Button component with icon and optional label.

```tsx
import { IconButton } from '@/components/ui';

export function Toolbar() {
  return (
    <>
      <IconButton icon="Plus" label="Add Device" />
      <IconButton icon="Trash2" variant="destructive" />
      <IconButton icon="Settings" variant="ghost" />
      <IconButton icon="Help" variant="outline" />
    </>
  );
}
```

**Props:**
- `icon` (string, required): Icon name
- `label` (string, optional): Button label
- `size` (IconSize, default: 'md'): Icon size
- `variant` ('default' | 'ghost' | 'outline' | 'destructive', default: 'default')
- All standard button props

**Variants:**
- `default`: Blue background with white text
- `ghost`: Transparent with hover effect
- `outline`: Border with hover background
- `destructive`: Red background for destructive actions

### IconBadge

Icon with a badge (number or dot).

```tsx
import { IconBadge } from '@/components/ui';

export function NotificationBell() {
  return (
    <>
      <IconBadge name="Bell" size="md" badge="5" />
      <IconBadge name="Mail" size="md" badge="3" badgeColor="bg-green-500" />
      <IconBadge name="AlertCircle" size="md" badge="!" />
    </>
  );
}
```

**Props:**
- `badge` (string | number, optional): Badge content
- `badgeColor` (string, default: 'bg-red-500'): Badge background color
- All Icon props

### IconGrid

Displays a grid of icons.

```tsx
import { IconGrid } from '@/components/ui';

export function IconShowcase() {
  return (
    <IconGrid
      icons={['Plus', 'Trash2', 'Pencil', 'Settings', 'Help', 'Refresh']}
      size="md"
      columns={3}
      gap={8}
    />
  );
}
```

**Props:**
- `icons` (string[], required): Array of icon names
- `size` (IconSize, default: 'md'): Icon size
- `columns` (number, default: 4): Number of grid columns
- `gap` (number, default: 4): Gap between icons in pixels

## Utilities

### getIconSize

Get icon size in pixels.

```tsx
import { getIconSize } from '@/lib/icon';

const size = getIconSize('lg'); // Returns: 32
const customSize = getIconSize(28); // Returns: 28
```

### getDeviceIconName

Get lucide-react icon name for a device type.

```tsx
import { getDeviceIconName } from '@/lib/icon';

const iconName = getDeviceIconName('router'); // Returns: 'Router'
```

### getActionIconName

Get lucide-react icon name for an action.

```tsx
import { getActionIconName } from '@/lib/icon';

const iconName = getActionIconName('delete'); // Returns: 'Trash2'
```

### getStatusIconName

Get lucide-react icon name for a status.

```tsx
import { getStatusIconName } from '@/lib/icon';

const iconName = getStatusIconName('online'); // Returns: 'CheckCircle'
```

### getDeviceIconColor

Get color for a device type.

```tsx
import { getDeviceIconColor } from '@/lib/icon';

const color = getDeviceIconColor('router'); // Returns: '#00CC66'
```

### getStatusIconColor

Get color for a status.

```tsx
import { getStatusIconColor } from '@/lib/icon';

const color = getStatusIconColor('online'); // Returns: '#00CC66'
```

### getIconSizeClass

Get Tailwind CSS class for icon size.

```tsx
import { getIconSizeClass } from '@/lib/icon';

const className = getIconSizeClass('lg'); // Returns: 'w-8 h-8'
```

### getIconAccessibilityLabel

Get accessibility label for an icon.

```tsx
import { getIconAccessibilityLabel } from '@/lib/icon';

const label = getIconAccessibilityLabel('device', 'router');
// Returns: 'Network Router'
```

## Constants

### ICON_SIZES

Object containing all icon sizes in pixels.

```tsx
import { ICON_SIZES } from '@/components/ui';

console.log(ICON_SIZES.md); // 24
```

### DEVICE_ICONS

Object mapping device types to lucide-react icon names.

```tsx
import { DEVICE_ICONS } from '@/components/ui';

console.log(DEVICE_ICONS.router); // 'Router'
```

### ACTION_ICONS

Object mapping action types to lucide-react icon names.

```tsx
import { ACTION_ICONS } from '@/components/ui';

console.log(ACTION_ICONS.delete); // 'Trash2'
```

### STATUS_ICONS

Object mapping status types to lucide-react icon names.

```tsx
import { STATUS_ICONS } from '@/components/ui';

console.log(STATUS_ICONS.online); // 'CheckCircle'
```

## Real-World Examples

### Device List with Status

```tsx
import { DeviceIcon, StatusIcon, Small } from '@/components/ui';

export function DeviceListItem({ device }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded border">
      <DeviceIcon deviceType={device.type} size="lg" />
      <div className="flex-1">
        <div className="font-semibold">{device.name}</div>
        <Small className="text-gray-600">{device.ip}</Small>
      </div>
      <StatusIcon status={device.online ? 'online' : 'offline'} size="md" />
    </div>
  );
}
```

### Toolbar with Actions

```tsx
import { IconButton } from '@/components/ui';

export function NetworkToolbar() {
  return (
    <div className="flex gap-2 p-3 border-b">
      <IconButton icon="Plus" label="Add Device" />
      <IconButton icon="Link2" label="Connect" />
      <IconButton icon="Radio" label="Ping" />
      <div className="flex-1" />
      <IconButton icon="Settings" variant="ghost" />
      <IconButton icon="Help" variant="ghost" />
    </div>
  );
}
```

### Status Indicator

```tsx
import { StatusIcon, Small } from '@/components/ui';

export function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-2">
      <StatusIcon status={connected ? 'connected' : 'disconnected'} size="sm" />
      <Small className={connected ? 'text-green-600' : 'text-red-600'}>
        {connected ? 'Connected' : 'Disconnected'}
      </Small>
    </div>
  );
}
```

### Achievement Badge

```tsx
import { IconBadge } from '@/components/ui';

export function AchievementBadge({ achievement }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <IconBadge
        name="Trophy"
        size="lg"
        badge={achievement.level}
        badgeColor="bg-yellow-500"
      />
      <div className="text-center">
        <div className="font-semibold">{achievement.name}</div>
        <Small className="text-gray-600">{achievement.description}</Small>
      </div>
    </div>
  );
}
```

## Accessibility

The icon system is designed with accessibility in mind:

- **Semantic HTML**: Uses `<svg>` elements with proper ARIA attributes
- **Accessibility Labels**: Built-in labels for all icon types
- **Color Independence**: Icons are not the only indicator of status
- **Focus Indicators**: Proper focus management for interactive icons
- **Screen Reader Support**: All icons have descriptive labels

## Best Practices

1. **Use Semantic Components**: Use `DeviceIcon`, `ActionIcon`, `StatusIcon` instead of generic `Icon`
2. **Provide Context**: Always provide text labels or tooltips for icons
3. **Consistent Sizing**: Use predefined sizes (xs, sm, md, lg, xl, 2xl)
4. **Color Meaning**: Use status colors consistently (green=success, red=error, etc.)
5. **Accessibility**: Always include ARIA labels for interactive icons
6. **Performance**: Icons are lightweight and load quickly
7. **Consistency**: Use the same icon for the same action throughout the app

## Testing

The icon system includes comprehensive tests:

```bash
# Run icon component tests
npm test -- src/components/ui/icon.test.tsx --run

# Run icon utilities tests
npm test -- src/lib/icon.test.ts --run
```

## Icon Library

The system uses [lucide-react](https://lucide.dev/) which provides:

- 500+ high-quality icons
- Consistent design and sizing
- SVG-based for scalability
- Customizable stroke width and colors
- Active community and regular updates

## Customization

To add new device, action, or status icons:

1. Edit `src/components/ui/icon.tsx`
2. Add new entries to `DEVICE_ICONS`, `ACTION_ICONS`, or `STATUS_ICONS`
3. Update the corresponding utility functions
4. Add tests for the new icons

## Related Documentation

- [Typography System](./TYPOGRAPHY_README.md)
- [Design System](../../constants/ui-ux/README.md)
- [Color System](../../constants/ui-ux/COLOR_SYSTEM.md)
- [Lucide React Documentation](https://lucide.dev/)
