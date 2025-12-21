# @dotty/mas

Mac App Store CLI integration for the dotty ecosystem.

## Installation

```bash
npm install @dotty/mas
```

## Requirements

- macOS
- [mas](https://github.com/mas-cli/mas) CLI installed (`brew install mas`)
- Signed into Mac App Store

## Usage

```typescript
import { MasService, createMasService } from '@dotty/mas';

const mas = createMasService();

// Check installation
const installed = await mas.isInstalled();
const version = await mas.getVersion();

// List installed apps
const apps = await mas.getInstalledApps();
// [{ id: '497799835', name: 'Xcode' }, ...]

// Check if specific app is installed
const hasXcode = await mas.isAppInstalled('497799835');

// Install an app by ID
await mas.install('497799835', { spinner: 'Installing Xcode...' });

// Search for apps
const results = await mas.search('Xcode');
console.log(results); // [{ id: '497799835', name: 'Xcode' }, ...]

// Check for updates
const outdated = await mas.checkForUpdates();
console.log(`${outdated.length} apps have updates available`);

// Upgrade all apps
await mas.upgradeAll({ spinner: 'Upgrading apps...' });
```

## API Reference

### MasService

| Method | Returns | Description |
|--------|---------|-------------|
| `isInstalled()` | `Promise<boolean>` | Check if mas CLI is installed |
| `getVersion()` | `Promise<string \| null>` | Get mas version |
| `getInstalledApps()` | `Promise<MasApp[]>` | List all installed App Store apps |
| `isAppInstalled(appId)` | `Promise<boolean>` | Check if app is installed by ID |
| `install(appId, options?)` | `Promise<{ success, stderr? }>` | Install an app by ID |
| `search(query)` | `Promise<MasApp[]>` | Search the Mac App Store |
| `checkForUpdates()` | `Promise<MasApp[]>` | List apps with available updates |
| `upgradeAll(options?)` | `Promise<{ success, stderr? }>` | Upgrade all installed apps |

### Types

```typescript
interface MasApp {
  id: string;
  name: string;
}
```

### Factory Function

```typescript
// Create a service instance
const mas = createMasService();
```

## Finding App IDs

App IDs are shown in the Mac App Store URL. For example:
- Xcode: `https://apps.apple.com/app/xcode/id497799835` -> ID is `497799835`

You can also search:

```typescript
const results = await mas.search('Xcode');
console.log(results[0].id); // '497799835'
```

## License

MIT
