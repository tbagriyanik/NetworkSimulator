# Contributing to Network Simulator

Welcome! This document provides a brief overview of the project architecture and development workflow to help you get started.

## 🏗️ Project Architecture

The project is a Next.js application built with TypeScript and Tailwind CSS.

### Key Directories:
- **`src/components/network`**: React components for the network UI (Topology, Terminal, Toolbar, etc.).
- **`src/lib/network`**: Core network simulation logic (executors, parsers, connectivity logic).
- **`src/contexts`**: React contexts for global state management (Language, Theme, etc.).
- **`src/tests`**: Unit and integration tests using Vitest.
- **`public/`**: Static assets like icons and device images.

## 🛠️ Development Workflow

We use **pnpm** for package management.

### Common Commands:
- **Install Dependencies**: `pnpm install`
- **Run Development Server**: `pnpm dev`
- **Run Tests**: `pnpm test`
- **Lint Code**: `pnpm lint`
- **Build for Production**: `pnpm build`

## 🎨 Coding Conventions

- **Localization**: Use the `LanguageContext` system. Avoid hardcoded strings; instead, add keys to `src/contexts/LanguageContext.tsx` and use the `t` object in components.
- **Accessibility**: Ensure interactive elements have appropriate ARIA labels. Icon-only buttons MUST have `aria-label`.
- **UI Components**: Use the existing UI components in `src/components/ui` (built with Radix UI and Lucide icons).
- **Types**: Maintain strict TypeScript typing. Avoid `any` and unnecessary non-null assertions.

## 🔒 Security & CORS Policy

- **XSS Protection**: All user inputs must be sanitized using `sanitizeInput` and `sanitizeObject` found in `src/lib/security/sanitizer.ts`. Our test suite explicitly verifies protection against common XSS vectors.
- **CORS Policy**: This is a frontend-centric Next.js application without a standalone REST API meant for third parties. Therefore, Cross-Origin Resource Sharing (CORS) is restricted by default. We employ strict security headers in `next.config.ts` (e.g., `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, `Referrer-Policy: strict-origin-when-cross-origin`) to restrict cross-origin interactions.

## 🧪 Testing

New features should include corresponding tests in `src/tests`. We prioritize logic testing for network executors and parsers.

---
Thank you for contributing to the Network Simulator!
