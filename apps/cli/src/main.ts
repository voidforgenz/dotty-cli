import { Command } from 'commander';
import { setupErrorHandlers, showIntro, select } from '@dotty/core';
import { registerProviderFactory } from '@dotty/runtime';
import { createProvider as createHomebrewProvider } from '@dotty/homebrew';
import { createProvider as createMasProvider } from '@dotty/mas';
import { registerInitCommand } from './commands/init.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerStatusCommand } from './commands/status.js';
import { registerDiffCommand } from './commands/diff.js';
import { registerApplyCommand } from './commands/apply.js';
import { registerPullCommand } from './commands/pull.js';
import { registerPushCommand } from './commands/push.js';
import { registerEditCommand } from './commands/edit.js';
import { registerAddCommand } from './commands/add.js';
import { registerMigrateCommand } from './commands/migrate.js';
import { registerProfileCommand } from './commands/profile.js';

// Register bundled providers
registerProviderFactory('homebrew', createHomebrewProvider);
registerProviderFactory('mas', createMasProvider);

// Version is injected at build time or read from package.json
const VERSION = '0.1.0';

// Setup global error handlers
setupErrorHandlers();

const program = new Command();

program
  .name('dotty')
  .description('Beautiful CLI for managing dotfiles')
  .version(VERSION)
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--dry-run', 'Show what would be done without doing it');

// Register all commands
registerInitCommand(program);
registerDoctorCommand(program);
registerStatusCommand(program);
registerDiffCommand(program);
registerApplyCommand(program);
registerPullCommand(program);
registerPushCommand(program);
registerEditCommand(program);
registerAddCommand(program);
registerMigrateCommand(program);
registerProfileCommand(program);

type CommandAction =
  | 'status'
  | 'apply'
  | 'pull'
  | 'push'
  | 'diff'
  | 'doctor'
  | 'init';

// If no subcommand provided, run interactive menu
program.action(async () => {
  showIntro('dotty');

  const action = await select<CommandAction>('What would you like to do?', [
    { value: 'status', label: 'Status', hint: 'Show Dottyfile and system status' },
    { value: 'apply', label: 'Apply', hint: 'Install missing apps (safe)' },
    { value: 'pull', label: 'Pull', hint: 'Add installed apps to Dottyfile' },
    { value: 'push', label: 'Push', hint: 'Sync machine to Dottyfile (destructive)' },
    { value: 'diff', label: 'Diff', hint: 'Preview pending dotfile changes' },
    { value: 'doctor', label: 'Doctor', hint: 'Check system health' },
    { value: 'init', label: 'Init', hint: 'Initialize dotty configuration' },
  ]);

  // Re-parse with the selected command
  await program.parseAsync(['node', 'dotty', action]);
});

program.parseAsync();
