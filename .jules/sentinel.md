# Sentinel Security Journal 🛡️

## 2025-05-15 - [SSR-Safe HTML Sanitization for IoT/Wifi Modules]
**Vulnerability:** XSS in IoT Web Panel and Wifi Control Panel due to un-sanitized user input (device names, SSIDs) being rendered via `dangerouslySetInnerHTML`.
**Learning:** The existing `sanitizeHTML` implementation relied on `document.createElement`, which is not available during SSR in Next.js, causing potential runtime crashes or bypasses if not handled.
**Prevention:** Use a string-based entity replacement for sanitization that works in both Node.js (SSR) and Browser (Client) environments. Always sanitize variables before interpolating them into HTML strings that will be rendered dangerously.
