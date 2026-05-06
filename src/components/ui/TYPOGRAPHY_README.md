# Typography System

The Typography System provides a comprehensive set of components and utilities for consistent text styling throughout the Network Simulator application. It implements the typography scale defined in the design system and ensures accessibility and readability across all screen sizes.

## Overview

The typography system includes:

- **Typography Components**: Semantic React components for different text levels
- **Typography Utilities**: Helper functions for typography calculations
- **Typography Hooks**: React hooks for responsive typography
- **CSS Utilities**: Tailwind-compatible CSS classes for typography
- **Responsive Sizing**: Automatic font size adjustment based on screen width

## Typography Scale

The application uses a 6-level typography scale:

| Level | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| H1 | 32px | 700 (Bold) | 1.2 | Page titles, main headings |
| H2 | 24px | 700 (Bold) | 1.3 | Section titles |
| H3 | 18px | 600 (Semibold) | 1.4 | Subsection titles |
| Body | 16px | 400 (Regular) | 1.5 | Main body text |
| Small | 14px | 400 (Regular) | 1.5 | Secondary text, labels |
| Tiny | 12px | 400 (Regular) | 1.4 | Captions, hints |

## Components

### Heading1

Used for page titles and main headings.

```tsx
import { Heading1 } from '@/components/ui';

export function MyComponent() {
  return <Heading1>Welcome to Network Simulator</Heading1>;
}
```

### Heading2

Used for section titles.

```tsx
import { Heading2 } from '@/components/ui';

export function MyComponent() {
  return <Heading2>Network Configuration</Heading2>;
}
```

### Heading3

Used for subsection titles.

```tsx
import { Heading3 } from '@/components/ui';

export function MyComponent() {
  return <Heading3>Basic Settings</Heading3>;
}
```

### Body

Used for main body text.

```tsx
import { Body } from '@/components/ui';

export function MyComponent() {
  return (
    <Body>
      This is the main body text. It provides clear, readable content for students.
    </Body>
  );
}
```

### Small

Used for secondary text and labels.

```tsx
import { Small } from '@/components/ui';

export function MyComponent() {
  return <Small>Secondary information</Small>;
}
```

### Caption

Used for captions, hints, and very small text.

```tsx
import { Caption } from '@/components/ui';

export function MyComponent() {
  return <Caption>This is a helpful hint</Caption>;
}
```

### Monospace

Used for code, IP addresses, and technical text.

```tsx
import { Monospace } from '@/components/ui';

export function MyComponent() {
  return <Monospace>192.168.1.1</Monospace>;
}
```

### Text

Generic text component with size variants.

```tsx
import { Text } from '@/components/ui';

export function MyComponent() {
  return (
    <>
      <Text variant="h1">Heading</Text>
      <Text variant="body">Body text</Text>
      <Text variant="caption">Caption</Text>
    </>
  );
}
```

### ResponsiveTypography

Automatically adjusts font size based on screen width.

```tsx
import { ResponsiveTypography } from '@/components/ui';

export function MyComponent() {
  return (
    <ResponsiveTypography
      as="h1"
      mobileSize="h3"
      tabletSize="h2"
      desktopSize="h1"
    >
      This heading is responsive
    </ResponsiveTypography>
  );
}
```

## Utilities

### getTypographyStyles

Get typography styles for a given variant.

```tsx
import { getTypographyStyles } from '@/lib/typography';

const styles = getTypographyStyles('h1');
// Returns: { fontSize: '32px', fontWeight: 700, lineHeight: 1.2 }
```

### getResponsiveFontSize

Calculate responsive font size based on viewport width.

```tsx
import { getResponsiveFontSize } from '@/lib/typography';

const size = getResponsiveFontSize(14, 16, window.innerWidth);
// Returns interpolated size between 14px and 16px
```

### getLineHeightPixels

Get line height in pixels.

```tsx
import { getLineHeightPixels } from '@/lib/typography';

const lineHeight = getLineHeightPixels(16, 1.5);
// Returns: 24
```

### getLetterSpacing

Calculate letter spacing based on font size.

```tsx
import { getLetterSpacing } from '@/lib/typography';

const spacing = getLetterSpacing(32);
// Returns: -0.5 (negative spacing for large text)
```

### getTypographyClass

Get CSS class for typography variant.

```tsx
import { getTypographyClass } from '@/lib/typography';

const className = getTypographyClass('h1');
// Returns: 'text-3xl font-bold leading-tight'
```

## Hooks

### useResponsiveFontSize

Hook to get responsive font size.

```tsx
import { useResponsiveFontSize } from '@/hooks/useTypography';

export function MyComponent() {
  const fontSize = useResponsiveFontSize(14, 16);
  return <div style={{ fontSize }}>Responsive text</div>;
}
```

### useBreakpointTypography

Hook to get current breakpoint.

```tsx
import { useBreakpointTypography } from '@/hooks/useTypography';

export function MyComponent() {
  const breakpoint = useBreakpointTypography();
  return <div>Current breakpoint: {breakpoint}</div>;
}
```

### useTypographyScale

Hook to get typography scale for current breakpoint.

```tsx
import { useTypographyScale } from '@/hooks/useTypography';

export function MyComponent() {
  const { getScale, breakpoint } = useTypographyScale();
  const h1Scale = getScale('h1');
  return <div>H1 size: {h1Scale.size}px</div>;
}
```

### useTypographyStyles

Hook to get typography styles as CSS object.

```tsx
import { useTypographyStyles } from '@/hooks/useTypography';

export function MyComponent() {
  const styles = useTypographyStyles('h1');
  return <div style={styles}>Styled text</div>;
}
```

## CSS Classes

The typography system provides Tailwind-compatible CSS classes:

```css
.text-h1 { /* 32px, bold */ }
.text-h2 { /* 24px, bold */ }
.text-h3 { /* 18px, semibold */ }
.text-body { /* 16px, regular */ }
.text-small { /* 14px, regular */ }
.text-tiny { /* 12px, regular */ }
.text-monospace { /* Monospace font */ }

/* Text utilities */
.text-truncate { /* Single line truncation */ }
.text-clamp-1 { /* Clamp to 1 line */ }
.text-clamp-2 { /* Clamp to 2 lines */ }
.text-clamp-3 { /* Clamp to 3 lines */ }

/* Letter spacing */
.tracking-tight { /* -0.5px */ }
.tracking-normal { /* 0px */ }
.tracking-wide { /* 0.5px */ }
.tracking-wider { /* 1px */ }

/* Line height */
.leading-tight { /* 1.2 */ }
.leading-snug { /* 1.3 */ }
.leading-normal { /* 1.4 */ }
.leading-relaxed { /* 1.5 */ }
.leading-loose { /* 1.75 */ }

/* Font weight */
.font-light { /* 300 */ }
.font-normal { /* 400 */ }
.font-medium { /* 500 */ }
.font-semibold { /* 600 */ }
.font-bold { /* 700 */ }
.font-extrabold { /* 800 */ }
```

## Responsive Typography

The typography system automatically adjusts font sizes for different screen sizes:

- **Mobile** (< 768px): 85% of desktop size
- **Tablet** (768px - 1024px): 95% of desktop size
- **Desktop** (> 1024px): 100% (default size)

### Using Responsive Typography

```tsx
import { ResponsiveTypography } from '@/components/ui';

export function MyComponent() {
  return (
    <ResponsiveTypography
      as="h1"
      mobileSize="h3"      // 18px on mobile
      tabletSize="h2"      // 24px on tablet
      desktopSize="h1"     // 32px on desktop
    >
      Responsive Heading
    </ResponsiveTypography>
  );
}
```

## Accessibility

The typography system is designed with accessibility in mind:

- **Semantic HTML**: Uses appropriate heading levels (h1-h3) and paragraph tags
- **Readable Font Sizes**: Minimum 12px for captions, 16px for body text
- **Sufficient Line Height**: 1.2-1.5 for optimal readability
- **Color Contrast**: All text meets WCAG AA standards (4.5:1 for normal text)
- **Responsive Sizing**: Automatically adjusts for different screen sizes

## Best Practices

1. **Use Semantic Components**: Use `Heading1`, `Heading2`, etc. instead of generic `div` elements
2. **Maintain Hierarchy**: Use heading levels in order (H1 → H2 → H3)
3. **Limit Heading Levels**: Don't skip heading levels (e.g., H1 → H3)
4. **Use Appropriate Variants**: Choose the right component for the content type
5. **Responsive Design**: Use `ResponsiveTypography` for responsive text
6. **Accessibility**: Always provide descriptive text and labels
7. **Consistency**: Use the typography scale consistently throughout the app

## Examples

### Device Configuration Panel

```tsx
import { Heading2, Body, Small, Monospace, Caption } from '@/components/ui';

export function DeviceConfigPanel() {
  return (
    <div>
      <Heading2>Device Configuration</Heading2>
      
      <div className="mt-4">
        <Body className="font-semibold">IP Address</Body>
        <Monospace>192.168.1.1</Monospace>
        <Caption>IPv4 address in dotted decimal notation</Caption>
      </div>
      
      <div className="mt-4">
        <Body className="font-semibold">Subnet Mask</Body>
        <Monospace>255.255.255.0</Monospace>
        <Caption>Defines the network portion of the IP address</Caption>
      </div>
    </div>
  );
}
```

### Achievement Notification

```tsx
import { Heading3, Body, Small } from '@/components/ui';

export function AchievementNotification() {
  return (
    <div className="bg-green-50 p-4 rounded">
      <Heading3 className="text-green-700">Achievement Unlocked!</Heading3>
      <Body className="mt-2">You've completed the Network Basics challenge</Body>
      <Small className="mt-2 text-green-600">+100 XP earned</Small>
    </div>
  );
}
```

### Help Panel

```tsx
import { Heading2, Heading3, Body, Small, Caption } from '@/components/ui';

export function HelpPanel() {
  return (
    <div>
      <Heading2>Getting Started</Heading2>
      
      <div className="mt-4">
        <Heading3>Step 1: Create a Device</Heading3>
        <Body>Drag a device from the palette to the canvas</Body>
        <Caption>You can drag PC, Router, or Switch devices</Caption>
      </div>
      
      <div className="mt-4">
        <Heading3>Step 2: Configure the Device</Heading3>
        <Body>Click on the device to open the configuration panel</Body>
        <Caption>Enter the IP address and other settings</Caption>
      </div>
    </div>
  );
}
```

## Testing

The typography system includes comprehensive tests:

```bash
# Run typography component tests
npm test -- src/components/ui/typography.test.tsx --run

# Run typography utilities tests
npm test -- src/lib/typography.test.ts --run
```

## Font Families

The typography system uses:

- **Primary**: Inter, Segoe UI, sans-serif (for all text)
- **Monospace**: Fira Code, monospace (for code and technical text)

These fonts are optimized for readability and are available through Google Fonts.

## Customization

To customize the typography system:

1. Edit `src/constants/ui-ux/index.ts` to change the typography scale
2. Update `src/styles/typography.css` for CSS class changes
3. Modify component styles in `src/components/ui/typography.tsx`

## Related Documentation

- [Design System](../../constants/ui-ux/README.md)
- [Color System](../../constants/ui-ux/COLOR_SYSTEM.md)
- [Responsive Design](../../../doc/README.md)
