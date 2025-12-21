# @dotty/cli

Main CLI binary for dotty - a beautiful CLI for managing dotfiles on macOS.

## Installation

```bash
npm install -g @dotty/cli
```

## Usage

```bash
dotty              # Interactive menu
dotty status       # Show dotfiles status
dotty sync         # Pull and apply changes
dotty diff         # Preview pending changes
dotty apply        # Apply dotfiles to system
dotty doctor       # Check system health
dotty edit <file>  # Edit a dotfile
dotty add <file>   # Add a file to dotfiles
```

## Global Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `--dry-run` | Show what would be done without doing it |
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

## Commands

### `dotty` (no subcommand)

Opens an interactive menu to select an action.

### `dotty status`

Shows the status of your dotfiles including:
- Pending file changes
- Run scripts to execute
- Git status of dotfiles repo

### `dotty sync`

Pulls changes from remote and applies them. Equivalent to `chezmoi update`.

### `dotty diff`

Shows a diff of pending changes before applying.

### `dotty apply`

Applies all pending dotfile changes to your system.

### `dotty doctor`

Checks system health and dependencies:
- Core tools: brew, chezmoi, git, node, pnpm
- Optional tools: dockutil, mas
- Directories: dotfiles, chezmoi source, TPM, zsh plugins
- Package version consistency

### `dotty edit <file>`

Opens a managed dotfile in your editor via chezmoi.

### `dotty add <file>`

Adds a new file to dotfiles management.

## Requirements

- Node.js 18+
- macOS (for full functionality)
- [chezmoi](https://chezmoi.io) (for dotfile management)
- [Homebrew](https://brew.sh) (optional, for brew operations)
- [mas](https://github.com/mas-cli/mas) (optional, for Mac App Store operations)

## Related Packages

- [@dotty/core](../../packages/core/README.md) - Shared utilities
- [@dotty/chezmoi](../../packages/chezmoi/README.md) - Chezmoi wrapper
- [@dotty/homebrew](../../packages/homebrew/README.md) - Homebrew integration
- [@dotty/mas](../../packages/mas/README.md) - Mac App Store integration

## License

MIT
