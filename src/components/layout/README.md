# Responsive Layout Components

A comprehensive responsive layout system for building mobile-first, responsive UIs with support for mobile, tablet, and desktop breakpoints.

## Overview

The responsive layout system provides:

- **Container Component**: Constrains content width and provides consistent padding
- **Row Component**: Creates responsive grid rows with configurable columns
- **Column Component**: Responsive grid columns with span, offset, and order support
- **Grid System**: 12-column grid system with responsive configuration
- **Media Query Utilities**: Helper functions for creating responsive styles
- **Breakpoint Detection**: Hooks for detecting current breakpoint

## Breakpoints

The system uses three main breakpoints:

- **Mobile**: < 640px
- **Tablet**: 641px - 1024px
- **Desktop**: > 1024px

## Components

### Container

Constrains content width and provides consistent padding across breakpoints.

```tsx
import { Container } from '@/components/layout';

export function MyComponent() {
  return (
    <Container maxWidth="lg" padding={{ mobile: 16, tablet: 24, desktop: 32 }}>
      <h1>Content</h1>
    </Container>
  );
}
```

**Props:**

- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' (default: 'lg')
- `padding`: ResponsiveGridValue<number> - Responsive padding
- `margin`: ResponsiveGridValue<number> - Responsive margin
- `fluid`: boolean - If true, ignores maxWidth
- `className`: string - Additional CSS classes
- `style`: CSSProperties - Inline styles

### Row

Creates a responsive grid row with configurable columns.

```tsx
import { Row, Column } from '@/components/layout';

export function MyGrid() {
  return (
    <Row 
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      gap={{ mobile: 16, tablet: 24, desktop: 32 }}
    >
      <Column>Item 1</Column>
      <Column>Item 2</Column>
      <Column>Item 3</Column>
    </Row>
  );
}
```

**Props:**

- `columns`: ResponsiveGridValue<GridColumns> - Number of columns per breakpoint
- `gap`: ResponsiveGridValue<number> - Gap between columns in pixels
- `align`: 'start' | 'center' | 'end' | 'stretch' (default: 'stretch')
- `justify`: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' (default: 'start')
- `wrap`: boolean - Enable/disable wrapping (default: true)
- `className`: string - Additional CSS classes
- `style`: CSSProperties - Inline styles

### Column

Responsive grid column with span, offset, and order support.

```tsx
import { Column } from '@/components/layout';

export function MyColumn() {
  return (
    <Column 
      span={{ mobile: 1, tablet: 1, desktop: 6 }}
      offset={{ mobile: 0, tablet: 0, desktop: 3 }}
      order={{ mobile: 1, tablet: 1, desktop: 2 }}
    >
      Half width on desktop, full width on mobile
    </Column>
  );
}
```

**Props:**

- `span`: ResponsiveGridValue<GridSpan> - Column span (1-12)
- `offset`: ResponsiveGridValue<GridSpan> - Column offset
- `order`: ResponsiveGridValue<number> - Flex order
- `align`: 'start' | 'center' | 'end' | 'stretch' (default: 'stretch')
- `justify`: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' (default: 'start')
- `className`: string - Additional CSS classes
- `style`: CSSProperties - Inline styles

## Grid Presets

Common grid configurations are available as presets:

```tsx
import { GRID_PRESETS, GRID_ITEM_PRESETS } from '@/lib/layout/grid';

// Full width single column
<Row {...GRID_PRESETS.fullWidth}>
  <Column>Content</Column>
</Row>

// Two column layout
<Row {...GRID_PRESETS.twoColumn}>
  <Column>Left</Column>
  <Column>Right</Column>
</Row>

// Three column layout
<Row {...GRID_PRESETS.threeColumn}>
  <Column>Left</Column>
  <Column>Center</Column>
  <Column>Right</Column>
</Row>

// Sidebar + main content
<Row {...GRID_PRESETS.sidebarLayout}>
  <Column {...GRID_ITEM_PRESETS.sidebar}>Sidebar</Column>
  <Column {...GRID_ITEM_PRESETS.main}>Main Content</Column>
</Row>
```

## Media Query Utilities

Helper functions for creating responsive styles:

```tsx
import { mq, createMediaQuery, createBreakpointQuery } from '@/lib/layout/media-queries';

// Media query builder
const mobileQuery = mq.up('tablet'); // "(min-width: 641px)"
const tabletQuery = mq.only('tablet'); // "(min-width: 641px) and (max-width: 1024px)"
const desktopQuery = mq.down('desktop'); // "(max-width: 9999px)"

// Create media query strings
const query = createMediaQuery(mq.up('tablet'), mq.landscape());
// "@media (min-width: 641px) and (orientation: landscape)"

// Breakpoint-specific query
const breakpointQuery = createBreakpointQuery('tablet', 'only');
// "@media (min-width: 641px) and (max-width: 1024px)"
```

## Hooks

### useBreakpoint

Detect current breakpoint and screen dimensions:

```tsx
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function MyComponent() {
  const { width, height, isMobile, isTablet, isDesktop, deviceCategory } = useBreakpoint();
  
  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
}
```

### useDeviceCategory

Get current device category:

```tsx
import { useDeviceCategory } from '@/hooks/use-breakpoint';

export function MyComponent() {
  const deviceCategory = useDeviceCategory(); // 'mobile' | 'tablet' | 'desktop'
  
  return <div>Current device: {deviceCategory}</div>;
}
```

### useResponsiveValue

Get responsive values based on breakpoint:

```tsx
import { useResponsiveValue } from '@/hooks/use-breakpoint';

export function MyComponent() {
  const padding = useResponsiveValue({
    mobile: 16,
    tablet: 24,
    desktop: 32,
  });
  
  return <div style={{ padding }}>Content</div>;
}
```

## Examples

### Responsive Two-Column Layout

```tsx
import { Container, Row, Column } from '@/components/layout';

export function TwoColumnLayout() {
  return (
    <Container maxWidth="2xl">
      <Row 
        columns={{ mobile: 1, tablet: 1, desktop: 2 }}
        gap={{ mobile: 16, tablet: 24, desktop: 32 }}
      >
        <Column span={{ mobile: 1, tablet: 1, desktop: 6 }}>
          <h2>Left Column</h2>
          <p>Content for left column</p>
        </Column>
        <Column span={{ mobile: 1, tablet: 1, desktop: 6 }}>
          <h2>Right Column</h2>
          <p>Content for right column</p>
        </Column>
      </Row>
    </Container>
  );
}
```

### Responsive Three-Column Layout

```tsx
import { Container, Row, Column } from '@/components/layout';

export function ThreeColumnLayout() {
  return (
    <Container maxWidth="2xl">
      <Row 
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        gap={{ mobile: 16, tablet: 24, desktop: 32 }}
      >
        <Column>
          <h3>Column 1</h3>
          <p>Content</p>
        </Column>
        <Column>
          <h3>Column 2</h3>
          <p>Content</p>
        </Column>
        <Column>
          <h3>Column 3</h3>
          <p>Content</p>
        </Column>
      </Row>
    </Container>
  );
}
```

### Sidebar + Main Content Layout

```tsx
import { Container, Row, Column } from '@/components/layout';

export function SidebarLayout() {
  return (
    <Container maxWidth="full">
      <Row 
        columns={{ mobile: 1, tablet: 1, desktop: 12 }}
        gap={{ mobile: 16, tablet: 24, desktop: 32 }}
      >
        <Column span={{ mobile: 1, tablet: 1, desktop: 3 }}>
          <aside>Sidebar</aside>
        </Column>
        <Column span={{ mobile: 1, tablet: 1, desktop: 9 }}>
          <main>Main Content</main>
        </Column>
      </Row>
    </Container>
  );
}
```

### Responsive Card Grid

```tsx
import { Container, Row, Column } from '@/components/layout';

export function CardGrid() {
  const cards = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <Container maxWidth="2xl">
      <Row 
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        gap={{ mobile: 16, tablet: 24, desktop: 32 }}
      >
        {cards.map(card => (
          <Column key={card}>
            <div className="bg-white rounded-lg shadow p-4">
              <h3>Card {card}</h3>
              <p>Card content</p>
            </div>
          </Column>
        ))}
      </Row>
    </Container>
  );
}
```

## Responsive Values

All responsive props accept an object with `mobile`, `tablet`, and `desktop` keys:

```tsx
interface ResponsiveGridValue<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
}
```

Example:

```tsx
<Row 
  columns={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap={{ mobile: 16, tablet: 24, desktop: 32 }}
>
  {/* Content */}
</Row>
```

## CSS Classes

The components use Tailwind CSS classes for styling. Common classes include:

- Grid: `grid`, `grid-cols-1` through `grid-cols-12`
- Gap: `gap-1` through `gap-10`
- Alignment: `items-start`, `items-center`, `items-end`, `items-stretch`
- Justification: `justify-start`, `justify-center`, `justify-end`, `justify-between`, `justify-around`, `justify-evenly`
- Flex: `flex`, `flex-col`, `flex-nowrap`
- Width: `w-full`, `mx-auto`
- Max-width: `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-2xl`

## Testing

The layout components include comprehensive unit tests and property-based tests:

- **Unit Tests**: Test individual component functionality
- **Property Tests**: Verify responsive behavior across all breakpoints

Run tests:

```bash
npm test -- src/components/layout/
```

## Performance Considerations

- Components use React.forwardRef for ref forwarding
- Minimal re-renders through proper prop memoization
- CSS classes are pre-computed and cached
- No inline style calculations on every render

## Accessibility

- All components support semantic HTML
- Proper ARIA labels can be added via className and style props
- Keyboard navigation is supported through standard HTML elements
- Focus management is handled by the browser

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Android)
- Requires Tailwind CSS for styling
