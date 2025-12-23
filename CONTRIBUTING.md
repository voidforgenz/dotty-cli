# Contributing to Dotty

Thanks for your interest in contributing! This document outlines how to get started.

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
  cli/              # @dotty/cli - Main CLI binary
packages/
  core/             # @dotty/core - Shared utilities, types, UI
  config/           # @dotty/config - Dottyfile parsing and schema
  chezmoi/          # @dotty/chezmoi - Chezmoi wrapper
  homebrew/         # @dotty/homebrew - Homebrew integration
  mas/              # @dotty/mas - Mac App Store integration
  macos/            # @dotty/macos - macOS system preferences
  runtime/          # @dotty/runtime - Runtime and migrations
```

### Package Dependencies

All provider packages depend only on `@dotty/core` - they must NOT depend on `@dotty/cli`:

```
@dotty/cli
  ├── @dotty/core
  ├── @dotty/config
  ├── @dotty/runtime
  ├── @dotty/chezmoi → @dotty/core
  ├── @dotty/homebrew → @dotty/core, @dotty/config, @dotty/runtime
  ├── @dotty/mas → @dotty/core, @dotty/config, @dotty/runtime
  └── @dotty/macos → @dotty/core, @dotty/config
```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm cli` | Run CLI from source (via tsx) |
| `pnpm dev` | Watch mode - rebuilds on changes |
| `pnpm build` | Build affected packages |
| `pnpm build:all` | Build all packages |
| `pnpm test` | Run affected tests |
| `pnpm test:all` | Run all tests with coverage |
| `pnpm lint` | Lint affected packages |
| `pnpm typecheck` | Type check affected packages |

### Working with Nx

```bash
# Build a specific package
npx nx build @dotty/core

# Run tests for a package
npx nx test @dotty/homebrew

# View dependency graph
npx nx graph

# See available targets for a project
npx nx show project @dotty/cli
```

## Code Style

- TypeScript with strict mode
- ESM modules (`"type": "module"`)
- Prettier for formatting
- ESLint for linting

### Commit Messages

We use [Conventional Commits](https://conventionalcommits.org):

```
feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance tasks
refactor: code restructuring
test: add or update tests
```

Commits are enforced via commitlint. Use `pnpm commit` for an interactive prompt.

### Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Ensure tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Ensure types check: `pnpm typecheck`
6. Open a PR with a clear description

## Testing

```bash
# Run all tests
pnpm test:all

# Run tests for a specific package
npx nx test @dotty/core

# Run with coverage
npx nx test @dotty/core -- --coverage
```

## Adding a New Package

1. Create the package directory under `packages/`
2. Add `package.json` with proper nx configuration
3. Add to the dependency graph in consuming packages
4. Add to the release configuration in `nx.json`

## Questions?

Open an issue for bugs or feature requests. For questions, start a discussion.
