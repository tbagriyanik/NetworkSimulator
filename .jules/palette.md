## 2025-05-15 - [A11y/UX Pattern: TooltipWrapper for Icon Buttons]
**Learning:** Raw `Tooltip` components wrapping `Button` with icons do not automatically provide accessible names to screen readers unless an explicit `aria-label` is added to the button. The `TooltipWrapper` component in this project is designed to solve this by injecting the title as an ARIA label.
**Action:** Always prefer `TooltipWrapper` over raw `Tooltip` for icon-only buttons to ensure both visual hints and accessibility are maintained without redundant code.
