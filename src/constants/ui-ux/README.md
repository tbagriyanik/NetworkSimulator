# UI/UX Constants

This directory contains all design system constants for the Network Simulator UI/UX improvements.

## Files

### index.ts
Main constants file containing:

- **Color Palette**:
  - Primary colors: Blue (#0066FF), Green (#00CC66), Orange (#FF9900), Red (#FF3333), Purple (#9933FF)
  - Secondary colors: Light variants for backgrounds and hover states
  - Neutral colors: Grays, white, black
  - High contrast colors: For accessibility

- **Typography**:
  - Font families: Inter/Segoe UI (primary), Fira Code (monospace)
  - Sizes: H1 (32px), H2 (24px), H3 (18px), Body (16px), Small (14px), Tiny (12px)
  - Weights: 400 (regular), 600 (semibold), 700 (bold)
  - Line heights: Optimized for readability

- **Responsive Breakpoints**:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

- **Spacing Scale**: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)

- **Animation**:
  - Durations: fast (150ms), normal (300ms), slow (500ms), verySlow (1000ms)
  - Easing functions: easeIn, easeOut, easeInOut, linear

- **Device & Connection Colors**: Mapped by type for visual consistency

- **Mode Features**: Device types and settings available in each learning mode

- **Achievement System**:
  - Categories: Network Basics, Advanced Concepts, Speed Challenges, Creative Builds, Troubleshooting
  - XP thresholds for levels 1-10
  - XP rewards for various actions

- **Accessibility**:
  - Touch target size: 44px (WCAG 2.5.5 Level AAA)
  - Focus indicator width: 2px
  - Contrast ratios: WCAG AA (4.5:1), WCAG AAA (7:1)

- **Validation Rules**: Regex patterns for IPv4, IPv6, MAC addresses, device names

## Usage

```typescript
import { COLOR_PALETTE, BREAKPOINTS, SPACING, MODE_FEATURES } from '@/constants/ui-ux';

// Use colors
const primaryBlue = COLOR_PALETTE.primary.blue; // #0066FF

// Use breakpoints
const isMobile = window.innerWidth < BREAKPOINTS.mobile;

// Use spacing
const padding = SPACING.md; // 16px

// Check device types available in beginner mode
const beginnerDevices = MODE_FEATURES.beginner.deviceTypes;
```

## Design Principles

- **Consistency**: All constants align with the design document
- **Accessibility**: Built-in support for WCAG AA/AAA compliance
- **Scalability**: Organized by category for easy maintenance
- **Flexibility**: Supports light/dark modes and high contrast mode
