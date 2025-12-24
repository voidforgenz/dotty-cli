# @dottyfiles/runtime

Dynamic provider loading and app resolution for the dotty ecosystem.

## Installation

```bash
npm install @dottyfiles/runtime
```

## Usage

### Loading Providers

```typescript
import { loadProvider, loadProviders, getAvailableProviders } from '@dottyfiles/runtime';

// Load a single provider
const homebrew = await loadProvider('homebrew');
if (homebrew) {
  const installed = await homebrew.getInstalled();
}

// Load multiple providers
const providers = await loadProviders(['homebrew', 'mas']);

// Get only available (installed and working) providers
const available = await getAvailableProviders(['homebrew', 'mas']);
```

### Resolving Apps to Providers

```typescript
import { loadDottyfile } from '@dottyfiles/config';
import {
  loadProviders,
  resolveAllApps,
  findMissingApps,
  installMissingApps,
} from '@dottyfiles/runtime';

const config = await loadDottyfile();
const providers = await loadProviders(config.providers);

// Resolve which provider handles each app
const { resolved, unresolved } = await resolveAllApps(
  config.apps,
  config.providers,
  providers
);

// Find apps not yet installed
const missing = await findMissingApps(resolved);

// Install them
const result = await installMissingApps(missing, {
  onProgress: (app, result) => {
    console.log(`${app.name}: ${result.success ? 'OK' : result.error}`);
  },
});
```

### Managing ~/.dotty Packages

```typescript
import {
  ensureDottyPackageJson,
  addProviderDependency,
  getInstallCommand,
} from '@dottyfiles/runtime';

// Create package.json in ~/.dotty
await ensureDottyPackageJson('0.1.0');

// Add a provider dependency
await addProviderDependency('homebrew', '0.1.0');

// Get the npm install command
const cmd = getInstallCommand(['homebrew', 'mas'], '0.1.0');
// => "npm install @dottyfiles/homebrew@0.1.0 @dottyfiles/mas@0.1.0"
```

## Provider Interface

Providers must implement this interface:

```typescript
interface Provider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  getInstalled(): Promise<InstalledApp[]>;
  isInstalled(app: App): Promise<boolean>;
  install(app: App, options?: InstallOptions): Promise<ProviderResult>;
  uninstall(app: App, options?: UninstallOptions): Promise<ProviderResult>;
}
```

## API Reference

### Provider Loading

| Function | Description |
|----------|-------------|
| `loadProvider(name)` | Load a single provider |
| `loadProviders(names)` | Load multiple providers |
| `getAvailableProviders(names)` | Get providers that are installed and working |
| `isProviderInstalled(name)` | Check if provider package is installed |
| `clearProviderCache()` | Clear the provider cache |

### App Resolution

| Function | Description |
|----------|-------------|
| `resolveAppProvider(app, order, providers)` | Find which provider handles an app |
| `resolveAllApps(apps, order, providers)` | Resolve all apps |
| `groupByProvider(resolved)` | Group resolved apps by provider |
| `findMissingApps(resolved)` | Find apps not installed |
| `findExtraApps(config, providers)` | Find installed apps not in config |
| `installMissingApps(missing, options)` | Install missing apps |

### Package Management

| Function | Description |
|----------|-------------|
| `ensureDottyPackageJson(version)` | Create ~/.dotty/package.json |
| `addProviderDependency(name, version)` | Add provider to package.json |
| `getInstalledProviderVersion(name)` | Get installed version |
| `checkProviderVersions(names, expected)` | Check version consistency |
| `getInstallCommand(names, version)` | Generate npm install command |
| `ensureDottyGitignore()` | Create .gitignore |

## License

MIT
