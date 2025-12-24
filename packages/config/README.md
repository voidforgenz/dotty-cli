# @dottyfiles/config

Dottyfile schema, parsing, and validation for the dotty ecosystem.

## Installation

```bash
npm install @dottyfiles/config
```

## Usage

### Loading a Dottyfile

```typescript
import {
  loadDottyfile,
  loadDottyfileSafe,
  dottyfileExists,
  getDottyfilePath,
} from '@dottyfiles/config';

// Check if Dottyfile exists
if (await dottyfileExists()) {
  const config = await loadDottyfile();
  console.log(config.apps);
}

// Or load safely (returns null if not found)
const config = await loadDottyfileSafe();
```

### Creating and Writing

```typescript
import {
  createDefaultDottyfile,
  writeDottyfile,
  ensureDottyDir,
  addApp,
} from '@dottyfiles/config';

// Create ~/.dotty directory
await ensureDottyDir();

// Create a new config
let config = createDefaultDottyfile();

// Add an app
config = addApp(config, {
  id: 'git',
  name: 'Git',
  homebrew: { formula: 'git' },
});

// Write to disk
await writeDottyfile(config);
```

### Working with Apps

```typescript
import { getActiveApps } from '@dottyfiles/config';

const config = await loadDottyfile();

// Get apps filtered by active profiles
const apps = getActiveApps(config);
```

### Parsing TOML Strings

```typescript
import { parseDottyfileString, tryParseDottyfile } from '@dottyfiles/config';

const toml = `
version = 1
providers = ["homebrew"]

[[apps]]
id = "git"
name = "Git"
homebrew = { formula = "git" }
`;

// Parse (throws on error)
const config = parseDottyfileString(toml);

// Parse safely (returns result object)
const result = tryParseDottyfile(toml);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Dottyfile Schema

See the [Dottyfile specification](../../docs/dottyfile.md) for the complete schema.

## API Reference

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `DOTTYFILE_NAME` | `"Dottyfile"` | Name of the config file |
| `DOTTY_DIR` | `".dotty"` | Name of the dotty directory |

### Functions

| Function | Description |
|----------|-------------|
| `getDottyDir()` | Get path to ~/.dotty |
| `getDottyfilePath()` | Get path to ~/.dotty/Dottyfile |
| `dottyfileExists()` | Check if Dottyfile exists |
| `dottyDirExists()` | Check if .dotty directory exists |
| `loadDottyfile(path?)` | Load and parse Dottyfile |
| `loadDottyfileSafe(path?)` | Load Dottyfile, return null on error |
| `parseDottyfileString(content)` | Parse TOML string |
| `tryParseDottyfile(content)` | Parse with error handling |
| `writeDottyfile(config, path?)` | Write Dottyfile to disk |
| `stringifyDottyfile(config)` | Convert to TOML string |
| `ensureDottyDir()` | Create ~/.dotty if needed |
| `createDefaultDottyfile()` | Create empty config |
| `addApp(config, app)` | Add app to config |
| `removeApp(config, appId)` | Remove app from config |
| `getActiveApps(config)` | Get apps for active profiles |

## License

MIT
