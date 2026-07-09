## 2025-05-14 - [Tooltip Accessibility with Rich Content]
**Learning:** Tooltip components that automatically derive `aria-label` from a `title` prop fail when that title contains rich content (React nodes) like keyboard shortcut badges. This leaves icon-only buttons without accessible names.
**Action:** Always provide an optional `ariaLabel` override in tooltip wrappers to ensure accessibility when the visual tooltip contains more than just plain text. Update the wrapper to clone the child with this explicit label.
