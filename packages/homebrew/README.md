# @dottyfiles/homebrew

Homebrew integration and Brewfile parsing for the dotty ecosystem.

## Installation

```bash
npm install @dottyfiles/homebrew
```

## Requirements

- macOS
- [Homebrew](https://brew.sh) installed

## Usage

### HomebrewService

```typescript
import { HomebrewService, createHomebrewService } from '@dottyfiles/homebrew';

const brew = createHomebrewService();

// Check installation
const installed = await brew.isInstalled();
const version = await brew.getVersion();

// Install packages
await brew.installFormula('git', { spinner: 'Installing git...' });
await brew.installCask('visual-studio-code', { spinner: 'Installing VS Code...' });

// Check if installed
const hasVSCode = await brew.isCaskInstalled('visual-studio-code');

// List installed packages
const casks = await brew.getInstalledCasks();
const formulas = await brew.getInstalledFormulas();

// Run brew bundle with a Brewfile
await brew.bundle('/path/to/Brewfile');

// Install Homebrew itself
await brew.install();
```

### Brewfile Parsing

```typescript
import { parseBrewfile, hasCask, hasMasApp } from '@dottyfiles/homebrew';

const brewfile = await parseBrewfile('/path/to/Brewfile');

console.log(brewfile.taps);    // ['homebrew/cask']
console.log(brewfile.brews);   // ['git', 'node']
console.log(brewfile.casks);   // ['visual-studio-code']
console.log(brewfile.mas);     // [{ name: 'Xcode', id: '497799835' }]

// Check contents
const hasVSCode = hasCask(brewfile, 'visual-studio-code');
const hasXcode = hasMasApp(brewfile, 'Xcode');
```

## API Reference

### HomebrewService

| Method | Returns | Description |
|--------|---------|-------------|
| `isInstalled()` | `Promise<boolean>` | Check if Homebrew is installed |
| `getVersion()` | `Promise<string \| null>` | Get Homebrew version |
| `install()` | `Promise<number>` | Install Homebrew |
| `installFormula(name, options?)` | `Promise<{ success, stderr? }>` | Install a formula |
| `installCask(name, options?)` | `Promise<{ success, stderr? }>` | Install a cask |
| `isCaskInstalled(name)` | `Promise<boolean>` | Check if cask is installed |
| `bundle(path, options?)` | `Promise<{ success, stderr? }>` | Run brew bundle |
| `getInstalledCasks()` | `Promise<string[]>` | List installed casks |
| `getInstalledFormulas()` | `Promise<string[]>` | List installed formulas |

### Brewfile Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `parseBrewfile(path)` | `Promise<BrewfileContents>` | Parse a Brewfile |
| `hasCask(brewfile, name)` | `boolean` | Check if cask is in Brewfile |
| `hasMasApp(brewfile, name)` | `boolean` | Check if MAS app is in Brewfile |

### Types

```typescript
interface BrewfileContents {
  taps: string[];
  brews: string[];
  casks: string[];
  mas: { name: string; id: string }[];
}
```

### Factory Function

```typescript
// Create a service instance
const brew = createHomebrewService();
```

## Brewfile Format

```ruby
# Taps
tap "homebrew/cask"
tap "homebrew/cask-fonts"

# Formulas
brew "git"
brew "node"

# Casks
cask "visual-studio-code"
cask "docker"

# Mac App Store apps
mas "Xcode", id: 497799835
mas "1Password", id: 1333542190
```

## License

MIT
