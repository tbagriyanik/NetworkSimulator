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

We use **npm** for package management.

### Common Commands:
- **Install Dependencies**: `npm install`
- **Run Development Server**: `npm run dev`
- **Run Tests**: `npm run test`
- **Lint Code**: `npm run lint`
- **Build for Production**: `npm run build`

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
---

## 🤖 Agent Conventions (for AI code-generation agents)

### Version bump strategy

The project uses **manual semantic versioning** via `npm version`.

Steps for each release:
1. Update `doc/history.md` with the new version, date, and changelog entries.
2. Run `npm version <bump>` — this tags the commit and updates `package.json`.
3. Push the commit and tag: `git push && git push --tags`.

### Rollback procedure

If a release introduces a critical bug:

1. **Revert the version-bump commit** (includes the tag):
   ```bash
   git revert --no-commit <tag>..HEAD
   git commit -m "revert: vX.Y.Z"
   git tag -d vX.Y.Z          # delete local tag
   git push origin :vX.Y.Z    # delete remote tag
   ```
   Then push the revert commit.

2. **Hotfix on the previous version**: branch from the last known-good tag, fix, bump patch, tag, push.

3. **Vercel auto-deploys** from the default branch — the revert commit triggers a rollback deployment automatically.

---

Thank you for contributing to the Network Simulator!
