# @dotty/chezmoi

Chezmoi wrapper for dotfile management in the dotty ecosystem.

## Installation

```bash
npm install @dotty/chezmoi
```

## Requirements

- [chezmoi](https://chezmoi.io) CLI installed

## Usage

```typescript
import { ChezmoiService, createChezmoiService } from '@dotty/chezmoi';

const chezmoi = createChezmoiService();

// Check installation
const installed = await chezmoi.isInstalled();
const version = await chezmoi.getVersion();

// Get status of pending changes
const { files, runScripts } = await chezmoi.getStatus();
console.log(`${files.length} files, ${runScripts.length} scripts pending`);

// Preview changes
await chezmoi.showDiff();

// Apply changes
const result = await chezmoi.apply({ spinner: 'Applying dotfiles...' });
if (result.success) {
  console.log('Applied successfully');
}

// Pull and apply from remote
await chezmoi.update({ spinner: 'Syncing dotfiles...' });

// Manage files
await chezmoi.add('/path/to/file', { spinner: 'Adding file...' });
await chezmoi.edit('/path/to/file');

// Initialize with a repo
await chezmoi.init('github.com/user/dotfiles', {
  apply: true,
  spinner: 'Setting up dotfiles...'
});

// Get paths
const sourcePath = await chezmoi.getSourcePath();
const managedFiles = await chezmoi.getManagedFiles();
```

## API Reference

### ChezmoiService

| Method | Returns | Description |
|--------|---------|-------------|
| `isInstalled()` | `Promise<boolean>` | Check if chezmoi CLI is installed |
| `getVersion()` | `Promise<string \| null>` | Get chezmoi version |
| `getManagedFiles()` | `Promise<string[]>` | List all managed file paths |
| `getStatus()` | `Promise<{ files, runScripts }>` | Get pending changes |
| `showDiff()` | `Promise<number>` | Display diff of pending changes |
| `apply(options?)` | `Promise<{ success, stderr? }>` | Apply pending changes |
| `update(options?)` | `Promise<{ success, stderr? }>` | Pull and apply from remote |
| `add(file, options?)` | `Promise<{ success, stderr? }>` | Add file to management |
| `edit(file)` | `Promise<number>` | Open file in editor |
| `init(repo, options?)` | `Promise<{ success, stderr? }>` | Initialize with a repo |
| `getSourcePath()` | `Promise<string>` | Get chezmoi source directory |

### Options

```typescript
interface ApplyOptions {
  spinner?: string;  // Spinner text while running
}

interface InitOptions {
  apply?: boolean;   // Apply after init
  spinner?: string;
}
```

### Factory Function

```typescript
// Create a service instance
const chezmoi = createChezmoiService();
```

## License

MIT
