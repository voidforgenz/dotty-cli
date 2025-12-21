# Dotty

A beautiful CLI for managing dotfiles, built as a modular Nx monorepo.

## Package Layout

```
apps/
  cli/              # @dotty/cli - Main CLI binary (dotty)
packages/
  core/             # @dotty/core - Shared utilities, types, UI components
  chezmoi/          # @dotty/chezmoi - Chezmoi wrapper for dotfile management
  homebrew/         # @dotty/homebrew - Homebrew integration & Brewfile parsing
  mas/              # @dotty/mas - Mac App Store integration
```

### Package Dependencies

```
@dotty/cli
  ├── @dotty/core
  ├── @dotty/chezmoi → @dotty/core
  ├── @dotty/homebrew → @dotty/core
  └── @dotty/mas → @dotty/core
```

All provider packages (`chezmoi`, `homebrew`, `mas`) depend only on `@dotty/core` - they must NOT depend on `@dotty/cli`.

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- chezmoi (for dotfile operations)
- Homebrew (for brew operations, macOS)
- mas (for Mac App Store operations, macOS)

### Quick Start

```sh
pnpm install    # Install dependencies
pnpm cli        # Run the CLI directly (uses tsx)
pnpm dev        # Watch mode - rebuilds on changes
```

### All Commands

| Command | Description |
|---------|-------------|
| `pnpm cli` | Run the CLI directly from source (via tsx) |
| `pnpm dev` | Watch mode - rebuilds and runs on file changes |
| `pnpm build` | Build all packages |
| `pnpm link` | Build and globally link the `dotty` command |
| `pnpm nx graph` | View dependency graph |
| `pnpm nx run-many -t test` | Run tests |
| `pnpm nx run-many -t lint` | Lint all packages |

### Global Installation (for testing)

```sh
pnpm link       # Builds and links globally
dotty --help    # Now available system-wide
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `dotty` | Interactive menu to select an action |
| `dotty status` | Show dotfiles and git status |
| `dotty sync` | Pull and apply remote changes |
| `dotty diff` | Preview pending changes |
| `dotty apply` | Apply dotfiles to system |
| `dotty doctor` | Check system health and dependencies |
| `dotty edit <file>` | Edit a dotfile |
| `dotty add <file>` | Add a file to dotfiles |

### Global Options

- `-y, --yes` - Skip confirmation prompts
- `--dry-run` - Show what would be done without doing it

## Releasing

All `@dotty/*` packages use **single-versioning** - they are always released together with the same version number.

### Version Management

Versions are managed via [Nx Release](https://nx.dev/features/manage-releases):

```sh
# Preview what would be released (dry-run)
pnpm nx release --dry-run

# Release a new version (bumps version, creates changelog, commits, tags)
pnpm nx release

# Release a specific version type
pnpm nx release --release-as minor
pnpm nx release --release-as major
pnpm nx release --release-as 1.2.3
```

### How Single-Versioning Works

The `nx.json` release configuration uses `"projectsRelationship": "fixed"`:
- All packages in `packages/*` and `@dotty/cli` share the same version
- Version bumps apply to all packages simultaneously
- A single `CHANGELOG.md` is maintained at the workspace root
- Git commits and tags are created automatically

### Publishing

After releasing, publish all packages to npm:

```sh
# Publish all packages (run after nx release)
pnpm nx release publish
```

## Architecture

### Core Package (`@dotty/core`)

Provides shared functionality:
- **Types**: `GlobalOptions`, `CheckResult`, `BrewfileContents`
- **Exec**: Command execution utilities (`commandExists`, `execOutput`, `execSilent`, `execWithSpinner`)
- **UI**: Interactive prompts and output (`showIntro`, `showOutro`, `log`, `check`, `cross`, `warning`, `select`, `confirm`)
- **Errors**: Error handling (`DottyError`, `setupErrorHandlers`)

### Provider Packages

Each provider wraps a specific tool:

- **@dotty/chezmoi**: `ChezmoiService` - wraps chezmoi commands (status, diff, apply, edit, add)
- **@dotty/homebrew**: `HomebrewService` - wraps brew commands; `parseBrewfile` for Brewfile parsing
- **@dotty/mas**: `MasService` - wraps mas commands for Mac App Store

### CLI Package (`@dotty/cli`)

The CLI uses Commander.js and imports from provider packages. Commands are loosely coupled - each command file registers itself with the program.

## Doctor Command

The `doctor` command validates system health and detects version mismatches:

```sh
dotty doctor
```

Checks performed:
- **Core Tools**: brew, chezmoi, git, node, pnpm
- **Optional Tools**: dockutil, mas
- **Directories**: dotfiles, chezmoi source, TPM, zsh plugins
- **Package Versions**: Validates all @dotty/* packages have matching versions

If package versions don't match, you'll see an error like:
```
✗ @dotty/core: Version mismatch (0.2.0 vs CLI 0.1.0)
```
