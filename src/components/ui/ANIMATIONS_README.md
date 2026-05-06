# Animation and Transition System

The Animation and Transition System provides a comprehensive set of components, utilities, and hooks for creating smooth, accessible animations throughout the Network Simulator application. It respects user preferences for reduced motion and provides both CSS-based and JavaScript-based animation options.

## Overview

The animation system includes:

- **Animation Components**: Reusable animation wrappers (FadeIn, SlideIn, Scale, Bounce, etc.)
- **Animation Utilities**: Helper functions for animation management
- **Animation Hooks**: React hooks for animation state and timing
- **CSS Animations**: Predefined keyframe animations and utility classes
- **Accessibility**: Built-in support for `prefers-reduced-motion`

## Animation Durations

The system defines 4 standard animation durations:

| Duration | Milliseconds | Use Case |
|----------|--------------|----------|
| fast | 150ms | Quick feedback, hover effects |
| normal | 300ms | Standard animations |
| slow | 500ms | Emphasis animations |
| verySlow | 1000ms | Long-running animations |

## Animation Easing Functions

The system provides 4 standard easing functions:

| Easing | Cubic Bezier | Use Case |
|--------|--------------|----------|
| easeIn | (0.4, 0, 1, 1) | Accelerating motion |
| easeOut | (0, 0, 0.2, 1) | Decelerating motion |
| easeInOut | (0.4, 0, 0.2, 1) | Smooth start and end |
| linear | linear | Constant speed |

## Components

### FadeIn

Fades in content from transparent to opaque.

```tsx
import { FadeIn } from '@/components/ui';

export function MyComponent() {
  return (
    <FadeIn duration={300} delay={0}>
      <div>This content fades in</div>
    </FadeIn>
  );
}
```

**Props:**
- `duration` (number, default: 300): Animation duration in milliseconds
- `delay` (number, default: 0): Animation delay in milliseconds
- `children` (ReactNode, required): Content to animate

### FadeOut

Fades out content from opaque to transparent.

```tsx
import { FadeOut } from '@/components/ui';

export function MyComponent() {
  return (
    <FadeOut duration={300} delay={0}>
      <div>This content fades out</div>
    </FadeOut>
  );
}
```

### SlideIn

Slides in content from a specified direction.

```tsx
import { SlideIn } from '@/components/ui';

export function MyComponent() {
  return (
    <>
      <SlideIn direction="up" duration={300}>
        <div>Slides in from bottom</div>
      </SlideIn>
      <SlideIn direction="left" duration={300}>
        <div>Slides in from left</div>
      </SlideIn>
    </>
  );
}
```

**Props:**
- `direction` ('up' | 'down' | 'left' | 'right', default: 'up')
- `duration` (number, default: 300)
- `delay` (number, default: 0)
- `children` (ReactNode, required)

### Scale

Scales content from 0.95 to 1.0 (grow effect).

```tsx
import { Scale } from '@/components/ui';

export function MyComponent() {
  return (
    <Scale duration={200}>
      <button>Click me</button>
    </Scale>
  );
}
```

### Bounce

Bounces content up and down repeatedly.

```tsx
import { Bounce } from '@/components/ui';

export function LoadingIndicator() {
  return (
    <Bounce duration={500}>
      <div className="w-4 h-4 bg-blue-600 rounded-full" />
    </Bounce>
  );
}
```

### Pulse

Pulses content opacity in and out.

```tsx
import { Pulse } from '@/components/ui';

export function LoadingState() {
  return (
    <Pulse duration={500}>
      <div className="w-full h-4 bg-gray-200 rounded" />
    </Pulse>
  );
}
```

### Spin

Rotates content continuously.

```tsx
import { Spin } from '@/components/ui';

export function LoadingSpinner() {
  return (
    <Spin duration={1000}>
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </Spin>
  );
}
```

### Shimmer

Creates a shimmer/skeleton loading effect.

```tsx
import { Shimmer } from '@/components/ui';

export function SkeletonLoader() {
  return (
    <Shimmer duration={1000}>
      <div className="w-full h-4 bg-gray-200 rounded" />
    </Shimmer>
  );
}
```

### Transition

Wraps content with CSS transitions.

```tsx
import { Transition } from '@/components/ui';

export function MyComponent() {
  return (
    <Transition property="all" duration={300} easing="easeInOut">
      <div>Content with smooth transitions</div>
    </Transition>
  );
}
```

**Props:**
- `property` (string, default: 'all'): CSS property to transition
- `duration` (number, default: 300): Transition duration
- `easing` (string, default: 'easeInOut'): Easing function

### Stagger

Animates children with staggered delays.

```tsx
import { Stagger } from '@/components/ui';

export function ListAnimation() {
  return (
    <Stagger staggerDelay={50}>
      <div>Item 1</div>
      <div>Item 2</div>
      <div>Item 3</div>
    </Stagger>
  );
}
```

**Props:**
- `staggerDelay` (number, default: 50): Delay between each child animation

### Confetti

Creates a celebratory confetti effect.

```tsx
import { Confetti } from '@/components/ui';

export function Achievement() {
  return (
    <Confetti duration={500} particleCount={50}>
      <div>Achievement Unlocked!</div>
    </Confetti>
  );
}
```

**Props:**
- `duration` (number, default: 500): Animation duration
- `particleCount` (number, default: 50): Number of confetti particles

### ReducedMotion

Respects user's `prefers-reduced-motion` preference.

```tsx
import { ReducedMotion } from '@/components/ui';

export function MyComponent() {
  return (
    <ReducedMotion>
      <FadeIn duration={300}>
        <div>Respects reduced motion preference</div>
      </FadeIn>
    </ReducedMotion>
  );
}
```

## Utilities

### getAnimationDuration

Get animation duration in milliseconds.

```tsx
import { getAnimationDuration } from '@/lib/animations';

const duration = getAnimationDuration('normal'); // 300
const customDuration = getAnimationDuration(500); // 500
```

### createAnimationCSS

Create CSS animation string.

```tsx
import { createAnimationCSS } from '@/lib/animations';

const animation = createAnimationCSS('fadeIn', 'normal', 'easeInOut', 0, 1);
// Returns: 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms 1'
```

### createTransitionCSS

Create CSS transition string.

```tsx
import { createTransitionCSS } from '@/lib/animations';

const transition = createTransitionCSS('all', 'normal', 'easeInOut', 0);
// Returns: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'
```

### prefersReducedMotion

Check if user prefers reduced motion.

```tsx
import { prefersReducedMotion } from '@/lib/animations';

if (prefersReducedMotion()) {
  // Disable animations
}
```

### getSafeAnimationDuration

Get animation duration that respects reduced motion preference.

```tsx
import { getSafeAnimationDuration } from '@/lib/animations';

const duration = getSafeAnimationDuration('normal');
// Returns 0 if reduced motion is preferred, otherwise 300
```

## Hooks

### useAnimationState

Manage animation state.

```tsx
import { useAnimationState } from '@/hooks/useAnimation';

export function MyComponent() {
  const { isAnimating, startAnimation, stopAnimation, toggleAnimation } = useAnimationState();

  return (
    <>
      <button onClick={startAnimation}>Start</button>
      <button onClick={stopAnimation}>Stop</button>
      <button onClick={toggleAnimation}>Toggle</button>
      {isAnimating && <div>Animating...</div>}
    </>
  );
}
```

### useAnimationComplete

Handle animation completion.

```tsx
import { useAnimationComplete } from '@/hooks/useAnimation';

export function MyComponent() {
  const { cancel } = useAnimationComplete('normal', () => {
    console.log('Animation complete!');
  });

  return <div>Content</div>;
}
```

### useReducedMotion

Check if user prefers reduced motion.

```tsx
import { useReducedMotion } from '@/hooks/useAnimation';

export function MyComponent() {
  const prefersReduced = useReducedMotion();

  return (
    <div style={{ animation: prefersReduced ? 'none' : 'fadeIn 300ms' }}>
      Content
    </div>
  );
}
```

### useSafeAnimationDuration

Get safe animation duration.

```tsx
import { useSafeAnimationDuration } from '@/hooks/useAnimation';

export function MyComponent() {
  const duration = useSafeAnimationDuration('normal');

  return <div style={{ animationDuration: `${duration}ms` }}>Content</div>;
}
```

### useAnimationFrame

Manage animation frame.

```tsx
import { useAnimationFrame } from '@/hooks/useAnimation';

export function MyComponent() {
  const { stop } = useAnimationFrame((deltaTime) => {
    console.log('Delta time:', deltaTime);
  });

  return <button onClick={stop}>Stop Animation</button>;
}
```

### useHoverAnimation

Manage hover animation state.

```tsx
import { useHoverAnimation } from '@/hooks/useAnimation';

export function MyComponent() {
  const { isHovered, handlers } = useHoverAnimation(
    () => console.log('Hover start'),
    () => console.log('Hover end')
  );

  return (
    <div {...handlers} style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}>
      Hover me
    </div>
  );
}
```

### useFocusAnimation

Manage focus animation state.

```tsx
import { useFocusAnimation } from '@/hooks/useAnimation';

export function MyComponent() {
  const { isFocused, handlers } = useFocusAnimation(
    () => console.log('Focus start'),
    () => console.log('Focus end')
  );

  return (
    <input
      {...handlers}
      style={{ boxShadow: isFocused ? '0 0 0 3px rgba(0, 102, 255, 0.3)' : 'none' }}
    />
  );
}
```

### useTransition

Get transition CSS properties.

```tsx
import { useTransition } from '@/hooks/useAnimation';

export function MyComponent() {
  const { transition, duration, easing } = useTransition('all', 'normal', 'easeInOut');

  return <div style={{ transition }}>Content</div>;
}
```

## CSS Classes

The system provides Tailwind-compatible CSS classes:

```css
/* Animation Classes */
.animate-fade-in { animation: fadeIn 300ms ease-in-out forwards; }
.animate-fade-out { animation: fadeOut 300ms ease-in-out forwards; }
.animate-slide-in-up { animation: slideInUp 300ms ease-out forwards; }
.animate-slide-in-down { animation: slideInDown 300ms ease-out forwards; }
.animate-slide-in-left { animation: slideInLeft 300ms ease-out forwards; }
.animate-slide-in-right { animation: slideInRight 300ms ease-out forwards; }
.animate-scale { animation: scale 200ms ease-out forwards; }
.animate-bounce { animation: bounce 500ms ease-in-out infinite; }
.animate-pulse { animation: pulse 500ms ease-in-out infinite; }
.animate-spin { animation: spin 1000ms linear infinite; }
.animate-shimmer { animation: shimmer 1000ms linear infinite; }

/* Transition Classes */
.transition { transition: all 300ms ease-in-out; }
.transition-fast { transition: all 150ms ease-in-out; }
.transition-slow { transition: all 500ms ease-in-out; }
.transition-colors { transition: color, background-color, border-color 300ms ease-in-out; }
.transition-transform { transition: transform 300ms ease-in-out; }
.transition-opacity { transition: opacity 300ms ease-in-out; }

/* Hover Effects */
.hover-scale:hover { transform: scale(1.05); }
.hover-lift:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.hover-glow:hover { box-shadow: 0 0 20px rgba(0, 102, 255, 0.5); }

/* Focus Effects */
.focus-ring:focus { box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1), 0 0 0 2px #0066FF; }
.focus-glow:focus { box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.3); }
```

## Accessibility

The animation system is designed with accessibility in mind:

- **Reduced Motion Support**: Automatically disables animations for users who prefer reduced motion
- **Semantic HTML**: Uses appropriate HTML elements
- **Focus Management**: Proper focus handling for interactive animations
- **Performance**: Optimized animations that don't impact performance

## Best Practices

1. **Respect Reduced Motion**: Always use `ReducedMotion` wrapper or `useReducedMotion` hook
2. **Use Appropriate Durations**: Use `fast` for feedback, `normal` for standard, `slow` for emphasis
3. **Combine Animations**: Layer multiple animations for complex effects
4. **Performance**: Use CSS animations for better performance than JavaScript
5. **Accessibility**: Provide non-animated alternatives for important information
6. **Consistency**: Use the same animations throughout the app
7. **Testing**: Test animations on different devices and browsers

## Real-World Examples

### Loading Spinner

```tsx
import { Spin } from '@/components/ui';

export function LoadingSpinner() {
  return (
    <Spin duration={1000}>
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </Spin>
  );
}
```

### Fade In List

```tsx
import { Stagger, FadeIn } from '@/components/ui';

export function DeviceList({ devices }) {
  return (
    <Stagger staggerDelay={50}>
      {devices.map((device) => (
        <FadeIn key={device.id} duration={300}>
          <div className="p-3 border rounded">{device.name}</div>
        </FadeIn>
      ))}
    </Stagger>
  );
}
```

### Achievement Notification

```tsx
import { Confetti, SlideIn } from '@/components/ui';

export function AchievementNotification({ achievement }) {
  return (
    <SlideIn direction="up" duration={300}>
      <Confetti duration={500} particleCount={50}>
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <div className="font-bold text-green-700">{achievement.name}</div>
          <div className="text-green-600">+{achievement.xp} XP</div>
        </div>
      </Confetti>
    </SlideIn>
  );
}
```

## Testing

The animation system includes comprehensive tests:

```bash
# Run animation utilities tests
npm test -- src/lib/animations.test.ts --run
```

## Related Documentation

- [Typography System](./TYPOGRAPHY_README.md)
- [Icon System](./ICON_README.md)
- [Design System](../../constants/ui-ux/README.md)
