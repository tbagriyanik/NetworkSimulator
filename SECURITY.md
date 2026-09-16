# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities.
2. Email the maintainers or use GitHub's private vulnerability reporting feature.
3. Include a description of the vulnerability, steps to reproduce, and potential impact.
4. You can expect an initial acknowledgment within 48 hours.

## Security Measures

This project implements the following security measures:

- **Content Security Policy (CSP)** with per-request nonces
- **CSRF protection** via double-submit cookie pattern
- **Input sanitization** against XSS and prototype pollution with fixpoint iteration (`sanitizeHTTPContent`, `sanitizeInput`) and key-by-key attribute parsing
- **Rate limiting** on all API endpoints (Redis-backed with in-memory fallback)
- **HMAC-signed tokens** for certificate score verification (server-side secret)
- **Client-side data obfuscation** (XOR + Base64) for sensitive localStorage data — not a substitute for server-side encryption
- **HTTP security headers** (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
