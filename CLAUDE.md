# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This is an Nx monorepo using pnpm. Common commands:

```bash
pnpm cli                           # Run CLI directly from source (via tsx)
pnpm dev                           # Watch mode - rebuilds on changes
pnpm build                         # Build all packages

pnpm nx build @dottyfiles/cli            # Build just the CLI
pnpm nx test @dottyfiles/cli             # Run tests for CLI
pnpm nx test @dottyfiles/core            # Run tests for core package
pnpm nx lint @dottyfiles/cli             # Lint
pnpm nx typecheck @dottyfiles/cli        # Type check
pnpm nx run-many -t test            # Run all tests
pnpm nx run-many -t lint            # Lint all packages
pnpm nx show project @dottyfiles/cli     # See available targets
```

## Package Layout

```
apps/
  cli/              # @dottyfiles/cli - Main CLI binary (entry: src/main.ts)
packages/
  core/             # @dottyfiles/core - Shared utilities, types, UI components
  chezmoi/          # @dottyfiles/chezmoi - Chezmoi wrapper for dotfile management
  homebrew/         # @dottyfiles/homebrew - Homebrew integration & Brewfile parsing
  mas/              # @dottyfiles/mas - Mac App Store integration
```

### Package Dependencies

All provider packages (`chezmoi`, `homebrew`, `mas`) depend only on `@dottyfiles/core` - they must NOT depend on `@dottyfiles/cli`.

```
@dottyfiles/cli
  ├── @dottyfiles/core
  ├── @dottyfiles/chezmoi → @dottyfiles/core
  ├── @dottyfiles/homebrew → @dottyfiles/core
  └── @dottyfiles/mas → @dottyfiles/core
```

## Architecture

- **@dottyfiles/core**: Shared types (`GlobalOptions`, `CheckResult`), exec utilities (`commandExists`, `execOutput`, `execWithSpinner`), UI helpers (`showIntro`, `log`, `select`, `confirm`), error handling (`DottyError`)
- **Provider packages**: Each wraps a specific tool - `ChezmoiService`, `HomebrewService`, `MasService`
- **@dottyfiles/cli**: Uses Commander.js. Commands in `apps/cli/src/commands/` register themselves via `registerXxxCommand(program)` pattern

## Tech Stack

- TypeScript (ES2022, NodeNext modules)
- esbuild for bundling (ESM format)
- Jest with SWC for testing
- pnpm package manager

## Releasing

All `@dottyfiles/*` packages use single-versioning via Nx Release - they are always released together.

### Automatic Canary Releases

Every merge to `main` automatically publishes a canary version to npm:
- Tag: `@canary`
- Version: `X.Y.Z-canary.{run_number}`
- Install: `npm install @dottyfiles/cli@canary`

### Stable Releases

Stable releases are triggered manually via GitHub Actions:

1. Go to Actions → "Release" workflow
2. Click "Run workflow"
3. Choose version bump: `patch`, `minor`, `major`, or exact version (e.g., `1.2.3`)
4. Optionally enable dry run to preview changes

The workflow will:
- Bump versions across all packages
- Generate changelog
- Build and test
- Commit, tag, and push to main
- Publish to npm with `@latest` tag
- Create a GitHub Release

## Git Commits

When creating commits:
- Do NOT add "Co-Authored-By" lines
- Do NOT add "Generated with Claude Code" or similar footers
- Write clean commit messages without AI attribution
