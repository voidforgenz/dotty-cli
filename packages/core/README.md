# @dotty/core

Shared utilities, types, and UI components for the dotty ecosystem.

## Installation

```bash
npm install @dotty/core
```

## Usage

### Execution Utilities

```typescript
import { exec, execOutput, execStream, commandExists } from '@dotty/core';

// Check if a command exists
const hasBrew = await commandExists('brew');

// Execute with optional spinner
const result = await exec('brew', ['install', 'git'], {
  spinner: 'Installing git...'
});
console.log(result.stdout, result.exitCode);

// Get command output only
const version = await execOutput('git', ['--version']);

// Stream output to terminal
await execStream('npm', ['install']);
```

### UI Components

```typescript
import { showIntro, showOutro, log, confirm, select } from '@dotty/core';

// Show branded intro/outro
showIntro('my-cli');
showOutro('All done!');

// Logging
log.success('Operation completed');
log.error('Something went wrong');
log.warn('Warning message');
log.info('Information');

// Prompts
const proceed = await confirm('Continue?');

const action = await select('Choose action:', [
  { value: 'install', label: 'Install' },
  { value: 'update', label: 'Update' },
]);
```

### Error Handling

```typescript
import { DottyError, errors, handleError, setupErrorHandlers } from '@dotty/core';

// Setup global handlers
setupErrorHandlers();

// Use predefined errors
throw errors.commandNotFound('brew');
throw errors.brewfileMissing();

// Custom error with suggestion
throw new DottyError(
  'Something failed',
  'CUSTOM_ERROR',
  'Try running dotty doctor'
);
```

## API Reference

### Execution

| Function | Description |
|----------|-------------|
| `exec(cmd, args, options)` | Execute command with optional spinner |
| `execOutput(cmd, args)` | Execute and return stdout |
| `execStream(cmd, args)` | Execute with live output |
| `commandExists(cmd)` | Check if command is in PATH |
| `execSudo(cmd, args)` | Execute with sudo |
| `dryRunLog(message)` | Log a dry-run message |

### UI

| Function | Description |
|----------|-------------|
| `showIntro(name)` | Show CLI intro banner |
| `showOutro(message)` | Show CLI outro message |
| `confirm(message)` | Yes/no prompt |
| `select(message, options)` | Select menu |
| `multiSelect(message, options)` | Multi-select menu |
| `text(message, placeholder)` | Text input |
| `spinner()` | Create controllable spinner |
| `note(message, title)` | Show boxed note |
| `check(message)` | Green checkmark |
| `cross(message)` | Red X |
| `warning(message)` | Yellow warning |
| `log.success/error/warn/info` | Styled logging |

### Types

```typescript
interface GlobalOptions {
  yes?: boolean;
  dryRun?: boolean;
}

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  version?: string;
}

interface BrewfileContents {
  taps: string[];
  brews: string[];
  casks: string[];
  mas: { name: string; id: string }[];
}
```

### Errors

| Error Creator | Description |
|---------------|-------------|
| `errors.commandNotFound(cmd)` | Command not in PATH |
| `errors.chezmoiFailed(action)` | Chezmoi operation failed |
| `errors.brewfileMissing()` | Brewfile not found |
| `errors.permissionDenied(path)` | Permission denied |
| `errors.notMacOS()` | macOS required |

## License

MIT
