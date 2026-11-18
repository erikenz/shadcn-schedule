# Contributing to shadcn-schedule

Thank you for your interest in contributing to `shadcn-schedule`! We welcome contributions of all kinds: bug fixes, documentation improvements, feature requests, and performance optimizations.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat others with respect and kindness.

---

## Monorepo Architecture

This project is organized as a Turborepo + pnpm monorepo:

```
shadcn-schedule/
├── apps/
│   └── storybook/             # Component playground and visual preview environment
├── packages/
│   └── shadcn-schedule/       # Core calendar and scheduling library
├── .changeset/                # Version bumping and release management
├── oxlint.config.ts           # Oxlint & Ultracite rules
└── turbo.json                 # Turborepo task pipeline
```

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **pnpm**: `>= 9.0.0` (uses `pnpm@12.18.0` exact)

---

## Local Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/shadcn-schedule.git
cd shadcn-schedule
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start the Storybook Playground

```bash
pnpm dev
# Or run specifically:
pnpm --filter @repo/storybook dev
```

Visit `http://localhost:6006` to inspect calendar views, themes, and interactive plugins with hot module reloading.

---

## Validation & Quality Checks

Before submitting a pull request, run the local quality checks:

```bash
# 1. Check code style, linting, and formatting (Ultracite + Oxlint)
pnpm check

# 2. Automatically fix formatting or auto-fixable lint issues
pnpm fix

# 3. Run TypeScript type checks across all workspaces
pnpm typecheck

# 4. Run Vitest unit & integration test suite
pnpm test

# 5. Check dead-code and unused exports with Fallow
pnpm fallow dead-code

# 6. Verify production build
pnpm build
```

---

## Adding a Changeset

Any change that impacts the public package must include a changeset:

```bash
pnpm changeset
```

Follow the interactive prompts:

1. Select `shadcn-schedule`
2. Choose version bump type (`patch` for bug fixes, `minor` for new backwards-compatible features, `major` for breaking changes)
3. Enter a clear summary of your changes

Commit the generated Markdown file in `.changeset/` along with your code changes.

---

## Pull Request Guidelines

1. **Target Branch**: Open pull requests against the `main` branch.
2. **Branch Naming**: Use descriptive branch names:
   - `fix/drag-snap-offset`
   - `feat/event-resizing`
   - `docs/custom-form-slot`
3. **Commit Messages**: Follow conventional commits:
   - `fix: correct event drag offset in horizontal orientation`
   - `feat: add snapDuration property independent of slotDuration`
   - `docs: clarify custom sheet slot usage`
4. **Automated CI**: Every PR runs the `Quality Gate` CI check (lint, typecheck, tests, Fallow dead-code audit, build, and changesets). All checks must pass before merging.
