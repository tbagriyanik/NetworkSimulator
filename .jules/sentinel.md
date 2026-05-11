# Sentinel Security Journal 🛡️

## 2026-05-08 - [Context-Aware Sanitization for Embedded HTML Panels]
**Vulnerability:** XSS in IoT Web Panel and Wifi Control Panel due to un-sanitized user input (device names, SSIDs) being rendered via `dangerouslySetInnerHTML`.
**Learning:** Generic HTML sanitization is insufficient and can cause functional regressions when applied to variables used in JavaScript logic (e.g., passwords with `&` becoming `&amp;` and failing comparison). Different contexts (HTML text, HTML attributes, JavaScript string literals) require different escaping strategies.
**Prevention:**
1. Use `sanitizeHTML` only for content rendered as text nodes in HTML.
2. Use `JSON.stringify()` for embedding variables into `<script>` blocks or `onclick` handlers.
3. When using `JSON.stringify()` in HTML attributes, additionally escape double quotes (e.g., `.replace(/"/g, '&quot;')`) and prevent script tag termination (e.g., `.replace(/</g, '\\u003c')`).

## 2026-05-10 - [Complex XSS in IoT Simple Programming]
**Vulnerability:** XSS and attribute injection in `iotWebPanel.ts` via rule IDs, sensor types, and device kinds being injected into `onclick` handlers and list items.
**Learning:** Even generated IDs (like `Math.random().toString(36)`) should be treated as potentially malicious if they can be manipulated (e.g., by mocking state) or if they are echoed back from user-defined names. The `safeJSONForHTML` helper must be combined with attribute escaping (`replace(/"/g, '&quot;')`) when used inside inline event handlers to prevent attribute breakout.
**Prevention:** Always use the `safeJSONForHTML(data).replace(/"/g, '&quot;')` pattern for variables injected into `onclick` or other event handler attributes in string-templated HTML.

## 2026-05-12 - [Inconsistent Sanitization in Generated Script Blocks]
**Vulnerability:** XSS in IoT Device Page due to incomplete sanitization in the client-side `updateRuleList` function compared to the server-side initial render.
**Learning:** When generating HTML that includes both static content and client-side update logic (e.g., using `innerHTML`), sanitization must be duplicated or shared. Helper functions available on the server (like `sanitizeHTML`) are not automatically available in the client-side `<script>` context.
**Prevention:** Include a simple, robust `escapeHtml` helper function within the generated `<script>` block to ensure consistent sanitization for all dynamic UI updates. Always sanitize both the initial server-side render and the subsequent client-side updates.
