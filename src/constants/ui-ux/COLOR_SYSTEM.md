# Color System Documentation

## Overview

The Network Simulator uses a comprehensive color system designed to appeal to students aged 13-18 while maintaining accessibility compliance. The system supports three themes: light mode, dark mode, and high-contrast mode.

## Color Palette

### Primary Colors

These vibrant, modern colors are used for main UI elements and device types:

- **Primary Blue** (`#0066FF`): Main actions, highlights, PC devices
- **Primary Green** (`#00CC66`): Success states, online status, Router devices
- **Primary Orange** (`#FF9900`): Warnings, attention, Switch devices
- **Primary Red** (`#FF3333`): Errors, offline status, Firewall devices
- **Primary Purple** (`#9933FF`): Achievements, special events, IoT devices

### Secondary Colors

Light backgrounds and hover states:

- **Light Blue** (`#E6F2FF`): Blue backgrounds
- **Light Green** (`#E6FFCC`): Green backgrounds
- **Light Orange** (`#FFEECC`): Orange backgrounds
- **Light Red** (`#FFCCCC`): Red backgrounds
- **Light Purple** (`#F0E6FF`): Purple backgrounds

### Neutral Colors

Text and backgrounds:

- **Dark Gray** (`#1A1A1A`): Primary text (light mode)
- **Medium Gray** (`#666666`): Secondary text
- **Light Gray** (`#F5F5F5`): Backgrounds (light mode)
- **White** (`#FFFFFF`): Card backgrounds
- **Black** (`#000000`): High contrast text

## Theme Support

### Light Mode (Default)

The default theme uses the primary color palette with light backgrounds and dark text.

```css
:root {
  --color-primary-blue: #0066FF;
  --color-text-primary: #1A1A1A;
  --color-bg-primary: #FFFFFF;
}
```

### Dark Mode

Adjusted colors for dark backgrounds with light text:

```css
.dark {
  --color-primary-blue: #4D94FF;
  --color-text-primary: #FFFFFF;
  --color-bg-primary: #0F0F0F;
}
```

### High Contrast Mode

Maximum contrast for accessibility (WCAG AAA):

```css
.high-contrast {
  --color-primary-blue: #0000FF;
  --color-text-primary: #000000;
  --color-bg-primary: #FFFFFF;
}
```

## CSS Variables

All colors are available as CSS variables for easy application:

```css
/* Primary colors */
--color-primary-blue
--color-primary-green
--color-primary-orange
--color-primary-red
--color-primary-purple

/* Device types */
--color-device-pc
--color-device-router
--color-device-switch
--color-device-iot
--color-device-firewall
--color-device-loadbalancer

/* Status */
--color-status-online
--color-status-offline

/* Semantic */
--color-success
--color-error
--color-warning
--color-info

/* Text */
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-disabled

/* Backgrounds */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary

/* Borders */
--color-border-primary
--color-border-secondary
--color-border-light
```

## Color Utilities

The `colorUtils.ts` module provides functions for color manipulation and accessibility checking:

### Color Conversion

```typescript
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from '@/utils/colorUtils';

// Convert hex to RGB
const rgb = hexToRgb('#0066FF'); // { r: 0, g: 102, b: 255 }

// Convert RGB to hex
const hex = rgbToHex(0, 102, 255); // '#0066FF'

// Convert to HSL
const hsl = rgbToHsl(0, 102, 255); // { h: 217, s: 100, l: 50 }

// Convert from HSL
const rgb2 = hslToRgb(217, 100, 50); // { r: 0, g: 102, b: 255 }
```

### Color Manipulation

```typescript
import { lighten, darken, blendColors, adjustSaturation, rotateHue } from '@/utils/colorUtils';

// Lighten a color
const lighter = lighten('#0066FF', 20); // Lighter blue

// Darken a color
const darker = darken('#0066FF', 20); // Darker blue

// Blend two colors
const blended = blendColors('#FF0000', '#0000FF', 0.5); // Purple

// Adjust saturation
const saturated = adjustSaturation('#0066FF', 20); // More saturated
const desaturated = adjustSaturation('#0066FF', -20); // Less saturated

// Rotate hue
const rotated = rotateHue('#FF0000', 120); // Green
```

### Accessibility Checking

```typescript
import { 
  getContrastRatio, 
  meetsWCAGAA, 
  meetsWCAGAAA,
  getContrastingTextColor 
} from '@/utils/colorUtils';

// Get contrast ratio
const ratio = getContrastRatio('#0066FF', '#FFFFFF'); // ~8.6

// Check WCAG AA compliance
const isAA = meetsWCAGAA('#0066FF', '#FFFFFF'); // true

// Check WCAG AAA compliance
const isAAA = meetsWCAGAAA('#0066FF', '#FFFFFF'); // true

// Get best text color for background
const textColor = getContrastingTextColor('#0066FF'); // '#FFFFFF'
```

## Using Colors in Components

### With CSS Variables

```css
.button {
  background-color: var(--color-primary-blue);
  color: var(--color-text-primary);
  border-color: var(--color-border-primary);
}
```

### With useColors Hook

```typescript
import { useColors } from '@/hooks/useColors';

export function MyComponent() {
  const { 
    getDeviceColor, 
    getStatusColor, 
    checkContrast,
    lighten,
    darken 
  } = useColors();

  const pcColor = getDeviceColor('pc'); // '#0066FF'
  const onlineColor = getStatusColor('online'); // '#00CC66'
  
  const isAccessible = checkContrast(pcColor, '#FFFFFF', 'AA');
  
  const lighter = lighten(pcColor, 20);
  const darker = darken(pcColor, 20);

  return (
    <div style={{ color: pcColor }}>
      Device Color
    </div>
  );
}
```

## Device Type Colors

Each device type has a dedicated color:

| Device Type | Color | Hex |
|-------------|-------|-----|
| PC | Blue | #0066FF |
| Router | Green | #00CC66 |
| Switch | Orange | #FF9900 |
| IoT | Purple | #9933FF |
| Firewall | Red | #FF3333 |
| Load Balancer | Blue | #0066FF |

## Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Online | Green | #00CC66 |
| Offline | Red | #FF3333 |

## Connection Type Colors

| Connection Type | Color | Hex |
|-----------------|-------|-----|
| Ethernet | Blue | #0066FF |
| Wireless | Purple | #9933FF |
| Serial | Orange | #FF9900 |

## Semantic Colors

| Semantic | Color | Hex |
|----------|-------|-----|
| Success | Green | #00CC66 |
| Error | Red | #FF3333 |
| Warning | Orange | #FF9900 |
| Info | Blue | #0066FF |

## Accessibility Compliance

### Contrast Ratios

The color system meets WCAG accessibility standards:

- **WCAG AA (Normal Text)**: 4.5:1 minimum
- **WCAG AA (Large Text)**: 3:1 minimum
- **WCAG AAA (Normal Text)**: 7:1 minimum
- **WCAG AAA (Large Text)**: 4.5:1 minimum

### High Contrast Mode

High contrast mode provides:

- Pure black text on white backgrounds
- High saturation colors for maximum distinction
- Thick borders (2px minimum)
- Increased focus indicator visibility

### Reduced Motion

The color system respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

## Best Practices

### 1. Use Semantic Colors

Always use semantic colors for their intended purpose:

```typescript
// Good
const errorColor = getSemanticColor('error');

// Avoid
const errorColor = '#FF0000'; // Hardcoded color
```

### 2. Check Contrast

Always verify contrast compliance for text:

```typescript
const isAccessible = checkContrast(bgColor, textColor, 'AA');
if (!isAccessible) {
  console.warn('Insufficient contrast ratio');
}
```

### 3. Use CSS Variables

Prefer CSS variables over hardcoded colors:

```css
/* Good */
.button {
  background-color: var(--color-primary-blue);
}

/* Avoid */
.button {
  background-color: #0066FF;
}
```

### 4. Respect Theme Changes

Use the `useTheme` hook to respond to theme changes:

```typescript
const { effectiveTheme } = useTheme();

useEffect(() => {
  // Update colors when theme changes
  updateComponentColors();
}, [effectiveTheme]);
```

### 5. Test Accessibility

Always test color combinations for accessibility:

```typescript
import { meetsWCAGAA } from '@/utils/colorUtils';

// Test in unit tests
expect(meetsWCAGAA(bgColor, textColor)).toBe(true);
```

## Color Palette Generation

Generate color variations from a base color:

```typescript
import { generateColorPalette } from '@/utils/colorUtils';

const palette = generateColorPalette('#0066FF');
// {
//   base: '#0066FF',
//   light: '#4D94FF',
//   lighter: '#99CCFF',
//   dark: '#0052CC',
//   darker: '#003D99',
//   saturated: '#0066FF',
//   desaturated: '#4D7F99'
// }
```

## Migration Guide

### From Hardcoded Colors

Before:
```typescript
const color = '#0066FF';
```

After:
```typescript
import { useColors } from '@/hooks/useColors';

const { getDeviceColor } = useColors();
const color = getDeviceColor('pc');
```

### From Tailwind Colors

Before:
```jsx
<div className="bg-blue-600 text-white">
```

After:
```jsx
<div className="bg-primary text-primary">
```

## Testing

Color utilities include comprehensive tests:

```bash
npm test -- src/utils/colorUtils.test.ts
```

Tests cover:
- Color conversion (hex ↔ RGB ↔ HSL)
- Color manipulation (lighten, darken, blend)
- Accessibility checking (contrast ratios, WCAG compliance)
- Color validation
- Palette generation

## References

- [WCAG 2.1 Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Color Accessibility](https://www.smashingmagazine.com/2021/07/accessible-colors-wcag/)
