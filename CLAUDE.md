# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This is an Nx monorepo using pnpm. Common commands:

```bash
pnpm cli                           # Run CLI directly from source (via tsx)
pnpm dev                           # Watch mode - rebuilds on changes
pnpm build                         # Build all packages

npx nx build @dotty/cli            # Build just the CLI
npx nx test @dotty/cli             # Run tests for CLI
npx nx test @dotty/core            # Run tests for core package
npx nx lint @dotty/cli             # Lint
npx nx typecheck @dotty/cli        # Type check
npx nx run-many -t test            # Run all tests
npx nx run-many -t lint            # Lint all packages
npx nx show project @dotty/cli     # See available targets
```

## Package Layout

```
apps/
  cli/              # @dotty/cli - Main CLI binary (entry: src/main.ts)
packages/
  core/             # @dotty/core - Shared utilities, types, UI components
  chezmoi/          # @dotty/chezmoi - Chezmoi wrapper for dotfile management
  homebrew/         # @dotty/homebrew - Homebrew integration & Brewfile parsing
  mas/              # @dotty/mas - Mac App Store integration
```

### Package Dependencies

All provider packages (`chezmoi`, `homebrew`, `mas`) depend only on `@dotty/core` - they must NOT depend on `@dotty/cli`.

```
@dotty/cli
  ├── @dotty/core
  ├── @dotty/chezmoi → @dotty/core
  ├── @dotty/homebrew → @dotty/core
  └── @dotty/mas → @dotty/core
```

## Architecture

- **@dotty/core**: Shared types (`GlobalOptions`, `CheckResult`), exec utilities (`commandExists`, `execOutput`, `execWithSpinner`), UI helpers (`showIntro`, `log`, `select`, `confirm`), error handling (`DottyError`)
- **Provider packages**: Each wraps a specific tool - `ChezmoiService`, `HomebrewService`, `MasService`
- **@dotty/cli**: Uses Commander.js. Commands in `apps/cli/src/commands/` register themselves via `registerXxxCommand(program)` pattern

## Tech Stack

- TypeScript (ES2022, NodeNext modules)
- esbuild for bundling (ESM format)
- Jest with SWC for testing
- pnpm package manager

## Releasing

All `@dotty/*` packages use single-versioning via Nx Release - they are always released together:

```bash
pnpm nx release --dry-run     # Preview release
pnpm nx release               # Bump version, changelog, commit, tag
pnpm nx release publish       # Publish to npm
```
