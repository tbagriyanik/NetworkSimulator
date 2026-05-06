# NetworkCanvas Component

## Overview

The `NetworkCanvas` component is the central workspace where students build and visualize networks. It provides an interactive SVG-based canvas for placing devices, drawing connections, and managing network topology.

**Requirements:** 3.1, 3.5, 8.1

## Features

### Core Functionality

1. **Device Rendering**
   - Renders devices with icons and labels
   - Displays device IP addresses
   - Shows device status indicators (online/offline)
   - Supports multiple device types (PC, Router, Switch, IoT, etc.)

2. **Device Selection**
   - Single-click selection
   - Multi-select with Shift+click
   - Visual highlighting of selected devices
   - Deselection by clicking empty canvas

3. **Device Movement**
   - Drag-and-drop device placement
   - Grid snapping for alignment
   - Boundary checking to keep devices within canvas
   - Smooth animations during drag

4. **Zoom and Pan**
   - Mouse wheel zoom (0.1x to 3x)
   - Middle-mouse button pan
   - Zoom clamping to prevent extreme values
   - Pan state persistence

5. **Grid System**
   - Visual grid background (16px spacing)
   - Optional grid snapping for device placement
   - Grid visibility based on zoom level

6. **Connection Visualization**
   - Lines connecting devices
   - Active connections (solid lines)
   - Inactive connections (dashed lines)
   - Connection status colors

7. **Status Indicators**
   - Online devices: Green (#00CC66)
   - Offline devices: Gray (#999999)
   - Real-time status updates

## Usage

### Basic Example

```tsx
import { NetworkCanvas } from '@/components/network/NetworkCanvas';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

const devices: CanvasDevice[] = [
  {
    id: 'pc-1',
    type: 'pc',
    name: 'PC-1',
    ip: '192.168.1.10',
    x: 100,
    y: 100,
    status: 'online',
    macAddress: '00:11:22:33:44:55',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' }],
  },
];

const connections: CanvasConnection[] = [];

export function MyNetworkApp() {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  return (
    <NetworkCanvas
      devices={devices}
      connections={connections}
      selectedDeviceIds={selectedDeviceIds}
      onDeviceSelect={(deviceId, isMultiSelect) => {
        if (isMultiSelect) {
          setSelectedDeviceIds([...selectedDeviceIds, deviceId]);
        } else {
          setSelectedDeviceIds([deviceId]);
        }
      }}
      onDeviceDeselect={(deviceId) => {
        setSelectedDeviceIds(selectedDeviceIds.filter(id => id !== deviceId));
      }}
      onDeviceMove={(deviceId, x, y) => {
        // Update device position in your state
      }}
      zoom={zoom}
      onZoomChange={setZoom}
      pan={pan}
      onPanChange={setPan}
      snapToGrid={true}
    />
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `devices` | `CanvasDevice[]` | Array of devices to render |
| `connections` | `CanvasConnection[]` | Array of connections between devices |
| `selectedDeviceIds` | `string[]` | IDs of currently selected devices |
| `onDeviceSelect` | `(deviceId: string, isMultiSelect: boolean) => void` | Callback when device is selected |
| `onDeviceDeselect` | `(deviceId: string) => void` | Callback when device is deselected |
| `onDeviceMove` | `(deviceId: string, x: number, y: number) => void` | Callback when device is moved |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onDeviceDoubleClick` | `(deviceId: string) => void` | - | Callback when device is double-clicked |
| `zoom` | `number` | `1` | Current zoom level (0.1 to 3) |
| `onZoomChange` | `(zoom: number) => void` | - | Callback when zoom changes |
| `pan` | `{ x: number; y: number }` | `{ x: 0, y: 0 }` | Current pan offset |
| `onPanChange` | `(pan: { x: number; y: number }) => void` | - | Callback when pan changes |
| `snapToGrid` | `boolean` | `true` | Enable grid snapping |
| `onSnapToGridChange` | `(enabled: boolean) => void` | - | Callback when grid snapping is toggled |
| `highContrastMode` | `boolean` | `false` | Enable high contrast styling |
| `className` | `string` | - | Additional CSS classes |

## Data Models

### CanvasDevice

```typescript
interface CanvasDevice {
  id: string;
  type: DeviceType; // 'pc' | 'router' | 'switch' | 'iot' | 'firewall'
  name: string;
  ip: string;
  ipv6?: string;
  subnet?: string;
  gateway?: string;
  dns?: string;
  macAddress?: string;
  x: number;
  y: number;
  status: 'online' | 'offline' | 'error';
  ports: CanvasPort[];
  // ... other properties
}
```

### CanvasConnection

```typescript
interface CanvasConnection {
  id: string;
  sourceDeviceId: string;
  sourcePort: string;
  targetDeviceId: string;
  targetPort: string;
  cableType: CableType;
  active: boolean;
}
```

## Interactions

### Mouse Interactions

| Interaction | Action |
|-------------|--------|
| **Left Click** | Select device or deselect all |
| **Shift + Left Click** | Multi-select device |
| **Double Click** | Open device configuration |
| **Drag Device** | Move device (with grid snapping if enabled) |
| **Middle Mouse Drag** | Pan canvas |
| **Mouse Wheel** | Zoom in/out |

### Keyboard Interactions

| Key | Action |
|-----|--------|
| **Tab** | Navigate between devices |
| **Shift + Click** | Multi-select |
| **Escape** | Deselect all |

### Touch Interactions (Mobile)

| Gesture | Action |
|---------|--------|
| **Tap** | Select device |
| **Tap + Drag** | Move device |
| **Pinch** | Zoom in/out |
| **Two-finger Drag** | Pan canvas |

## Styling

### CSS Classes

The component uses CSS modules with the following classes:

- `.networkCanvas` - Main container
- `.deviceGroup` - Device group element
- `.deviceLabel` - Device name label
- `.ipLabel` - IP address label
- `.connectionLine` - Connection line
- `.statusIndicator` - Status indicator circle
- `.gridLine` - Grid background line
- `.controls` - Control buttons container
- `.controlButton` - Individual control button

### Color Palette

| Color | Value | Usage |
|-------|-------|-------|
| Online | `#00CC66` | Online device status |
| Offline | `#999999` | Offline device status |
| Selected | `#0066FF` | Selected device border |
| Hover | `#E6F2FF` | Hover background |
| Connection | `#0066FF` | Connection lines |
| Grid | `#F0F0F0` | Grid background |
| Text | `#1A1A1A` | Text color |
| Border | `#CCCCCC` | Border color |

## Accessibility

### WCAG Compliance

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Devices have `data-device-id` attributes for identification
- **Focus Indicators**: Visible focus outlines on interactive elements
- **High Contrast Mode**: Supported with enhanced colors and borders
- **Color Contrast**: Meets WCAG AA standards (4.5:1 for text)

### ARIA Labels

The component uses semantic HTML and data attributes:

```tsx
<g data-device-id={device.id}>
  {/* Device content */}
</g>
```

### Keyboard Navigation

- **Tab**: Navigate between devices
- **Shift+Tab**: Navigate backwards
- **Enter**: Select device
- **Escape**: Deselect all

## Performance Considerations

### Optimization Techniques

1. **SVG Rendering**: Uses SVG for efficient vector graphics rendering
2. **Viewport Culling**: Only renders visible devices and connections
3. **Memoization**: Uses `useMemo` to prevent unnecessary re-renders
4. **RAF Throttling**: Uses `requestAnimationFrame` for smooth animations
5. **Event Delegation**: Minimizes event listeners

### Performance Tips

- Keep device count under 1000 for optimal performance
- Use `snapToGrid` to reduce coordinate precision
- Disable animations on low-end devices
- Use `highContrastMode` sparingly (adds overhead)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android 80+

## Known Limitations

1. **SVG Rendering**: Limited to ~1000 devices before performance degradation
2. **Touch Support**: Pinch-to-zoom requires two-finger gesture
3. **Grid Snapping**: Only works with 16px grid size
4. **Connection Drawing**: Not implemented in this component (Part 1)

## Future Enhancements

- [ ] Connection drawing UI
- [ ] Multi-device alignment tools
- [ ] Undo/Redo support
- [ ] Copy/Paste devices
- [ ] Device templates
- [ ] Network statistics overlay
- [ ] Ping visualization
- [ ] Export to image/PDF

## Testing

### Unit Tests

Run tests with:

```bash
npm test -- NetworkCanvas.test.tsx
```

### Test Coverage

- Device rendering: ✓
- Device selection: ✓
- Device movement: ✓
- Zoom controls: ✓
- Pan controls: ✓
- Grid snapping: ✓
- Status indicators: ✓
- Connection visualization: ✓
- Accessibility: ✓
- Responsive design: ✓

## Troubleshooting

### Devices Not Rendering

- Check that `devices` array is not empty
- Verify device coordinates are within canvas bounds
- Check browser console for errors

### Zoom Not Working

- Ensure `onZoomChange` callback is provided
- Check that zoom value is between 0.1 and 3
- Verify mouse wheel event is not prevented

### Grid Snapping Not Working

- Ensure `snapToGrid` prop is `true`
- Check that device coordinates are being updated
- Verify grid size is 16px

### Performance Issues

- Reduce number of devices
- Disable animations
- Use viewport culling
- Check browser DevTools for bottlenecks

## Related Components

- `DeviceIcon` - Renders device icons
- `ConnectionLine` - Renders connection lines
- `DeviceNode` - Renders individual device nodes
- `NetworkTopology` - Full network topology component

## References

- [Design Document](./design.md) - Full design specification
- [Requirements Document](./requirements.md) - Feature requirements
- [SVG Documentation](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [React Performance](https://react.dev/reference/react/useMemo)
