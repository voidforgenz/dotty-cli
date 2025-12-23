# Dotty

A beautiful CLI for managing macOS dotfiles and system configuration.

> **Alpha Software**: This project is under active development. APIs may change.

## Features

- **Dotfile Management**: Powered by [chezmoi](https://chezmoi.io) for cross-machine dotfile sync
- **Homebrew Integration**: Manage formulae, casks, and taps declaratively
- **Mac App Store**: Install and track App Store apps via [mas](https://github.com/mas-cli/mas)
- **Profile Support**: Different configurations for work, personal, etc.
- **Beautiful CLI**: Interactive prompts and colorful output

## Installation

```bash
# Install globally from npm
npm install -g @dotty/cli

# Or with pnpm
pnpm add -g @dotty/cli
```

### Prerequisites

- **Node.js** 18+
- **macOS** (required for Homebrew and Mac App Store features)
- **chezmoi** - `brew install chezmoi`
- **Homebrew** - https://brew.sh
- **mas** (optional) - `brew install mas`

## Quick Start

```bash
# Initialize dotty in your dotfiles directory
dotty init

# Check system health and dependencies
dotty doctor

# Show current status
dotty status

# Preview pending changes
dotty diff

# Apply your dotfiles configuration
dotty apply
```

## Commands

| Command | Description |
|---------|-------------|
| `dotty init` | Initialize dotty configuration |
| `dotty doctor` | Check system health and dependencies |
| `dotty status` | Show Dottyfile and system status |
| `dotty diff` | Preview pending changes (chezmoi diff) |
| `dotty apply` | Apply Dottyfile to system (install missing apps) |
| `dotty pull` | Add currently installed apps to Dottyfile |
| `dotty push` | Sync machine to Dottyfile (install missing, uninstall extra) |
| `dotty edit <file>` | Edit a dotfile (chezmoi edit) |
| `dotty add <file>` | Add a file to chezmoi management |
| `dotty migrate` | Migrate Dottyfile to latest schema version |
| `dotty profile` | Manage configuration profiles |

### Global Options

- `-y, --yes` - Skip confirmation prompts
- `--dry-run` - Show what would be done without making changes
- `-V, --version` - Output version number
- `-h, --help` - Display help

## Packages

Dotty is built as a modular monorepo. While most users only need `@dotty/cli`, the underlying packages are available separately:

| Package | Description |
|---------|-------------|
| [@dotty/cli](https://npmjs.com/package/@dotty/cli) | Main CLI binary |
| [@dotty/core](https://npmjs.com/package/@dotty/core) | Shared utilities, types, UI components |
| [@dotty/config](https://npmjs.com/package/@dotty/config) | Dottyfile parsing and schema |
| [@dotty/chezmoi](https://npmjs.com/package/@dotty/chezmoi) | Chezmoi wrapper |
| [@dotty/homebrew](https://npmjs.com/package/@dotty/homebrew) | Homebrew integration |
| [@dotty/mas](https://npmjs.com/package/@dotty/mas) | Mac App Store integration |
| [@dotty/macos](https://npmjs.com/package/@dotty/macos) | macOS system preferences |
| [@dotty/runtime](https://npmjs.com/package/@dotty/runtime) | Runtime and migrations |

## Development

```bash
# Clone the repo
git clone https://github.com/voidforge/dotty.git
cd dotty

# Install dependencies
pnpm install

# Run the CLI from source
pnpm cli

# Run in watch mode
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT - see [LICENSE](LICENSE)
