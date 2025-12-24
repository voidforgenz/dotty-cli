# Contributing to Dotty

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- macOS (for full functionality)
- chezmoi (`brew install chezmoi`)
- Homebrew
- mas (`brew install mas`) - optional

### Getting Started

```bash
# Clone the repo
git clone https://github.com/voidforge/dotty.git
cd dotty

# Install dependencies
pnpm install

# Run from source
pnpm cli --help

# Run in watch mode (rebuilds on changes)
pnpm dev
```

## Project Structure

```
apps/
  cli/              # @dottyfiles/cli - Main CLI binary
packages/
  core/             # @dottyfiles/core - Shared utilities, types, UI
  config/           # @dottyfiles/config - Dottyfile parsing and schema
  chezmoi/          # @dottyfiles/chezmoi - Chezmoi wrapper
  homebrew/         # @dottyfiles/homebrew - Homebrew integration
  mas/              # @dottyfiles/mas - Mac App Store integration
  macos/            # @dottyfiles/macos - macOS system preferences
  runtime/          # @dottyfiles/runtime - Runtime and migrations
```

### Package Dependencies

All provider packages depend only on `@dottyfiles/core` - they must NOT depend on `@dottyfiles/cli`:

```
@dottyfiles/cli
  ├── @dottyfiles/core
  ├── @dottyfiles/config
  ├── @dottyfiles/runtime
  ├── @dottyfiles/chezmoi → @dottyfiles/core
  ├── @dottyfiles/homebrew → @dottyfiles/core, @dottyfiles/config, @dottyfiles/runtime
  ├── @dottyfiles/mas → @dottyfiles/core, @dottyfiles/config, @dottyfiles/runtime
  └── @dottyfiles/macos → @dottyfiles/core, @dottyfiles/config
```

## Development Commands

This project uses [Nx](https://nx.dev) for build orchestration. Commands come in two variants:

### Affected Commands (Default)

These only run on packages affected by your changes (compared to `main` branch):

```bash
pnpm build       # Build affected packages only
pnpm test        # Test affected packages only
pnpm lint        # Lint affected packages only
pnpm typecheck   # Type check affected packages only
```

### Full Commands (`:all` suffix)

These run on **all packages** regardless of what changed - useful for CI or verifying everything works:

```bash
pnpm build:all      # Build all packages
pnpm test:all       # Test all packages (with coverage)
pnpm lint:all       # Lint all packages
pnpm typecheck:all  # Type check all packages
```

### Other Commands

```bash
pnpm cli         # Run CLI from source (via tsx)
pnpm dev         # Watch mode - rebuilds on changes
pnpm commit      # Interactive commit prompt (commitizen)
```

## Working with Nx

### Running Tasks on Specific Packages

```bash
# Build a specific package
pnpm nx build @dottyfiles/core

# Run tests for a package
pnpm nx test @dottyfiles/homebrew

# Run multiple tasks
pnpm nx run-many -t lint test build
```

### Skipping the Cache

Nx caches task results for speed. To force a fresh run:

```bash
# Skip cache for a single command
pnpm nx build @dottyfiles/core --skip-nx-cache

# Skip cache for affected command
pnpm build -- --skip-nx-cache

# Skip cache for all packages
pnpm build:all -- --skip-nx-cache
```

### Useful Nx Commands

```bash
# View the project dependency graph
pnpm nx graph

# See available targets for a project
pnpm nx show project @dottyfiles/cli

# See what would be affected by your changes
pnpm nx show projects --affected

# Reset the Nx cache (if things get weird)
pnpm nx reset
```

## Code Style

- **TypeScript** with strict mode enabled
- **ESM modules** (`"type": "module"` in package.json)
- **Prettier** for code formatting
- **ESLint** for linting

Unused variables should be prefixed with `_` (e.g., `_unusedParam`).

## Commit Messages

We use [Conventional Commits](https://conventionalcommits.org). Commits are validated by commitlint.

```
feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance tasks
refactor: code restructuring
test: add or update tests
```

**Breaking changes:** Add `!` after the type or include `BREAKING CHANGE:` in the body:

```
feat!: remove deprecated sync command

BREAKING CHANGE: The sync command has been removed. Use apply/pull/push instead.
```

Use `pnpm commit` for an interactive prompt that guides you through the format.

## Pull Request Workflow

1. Fork the repo and create a feature branch from `main`
2. Make your changes with clear, conventional commit messages
3. Ensure all checks pass:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
4. Push your branch and open a PR
5. CI will run automatically - all checks must pass before merge

## Testing

```bash
# Run affected tests
pnpm test

# Run all tests with coverage
pnpm test:all

# Run tests for a specific package
pnpm nx test @dottyfiles/core

# Run tests with coverage for a specific package
pnpm nx test @dottyfiles/core -- --coverage

# Run a specific test file
pnpm nx test @dottyfiles/core -- --testPathPattern=exec.spec.ts
```

## Adding a New Package

1. Create the package directory under `packages/`
2. Add `package.json` with:
   - Proper `name` (`@dottyfiles/package-name`)
   - `publishConfig.access: "public"`
   - Nx build configuration
3. Add the package to consuming packages' dependencies
4. The package is automatically included in releases (via `packages/*` in nx.json)

## Debugging

### Running with Debug Output

```bash
# Verbose Nx output
NX_VERBOSE_LOGGING=true pnpm build

# Debug a specific command
DEBUG=* pnpm cli doctor
```

### Common Issues

**"Cannot find module" errors after switching branches:**
```bash
pnpm install
pnpm nx reset
```

**Tests failing with stale cache:**
```bash
pnpm nx test @dottyfiles/core --skip-nx-cache
```

**Build outputs seem wrong:**
```bash
pnpm nx reset
pnpm build:all
```

## Questions?

- **Bugs & Features:** Open an issue
- **Questions:** Start a discussion
- **Security:** Email maintainers directly (do not open public issues)
