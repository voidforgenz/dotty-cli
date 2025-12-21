import { Command } from 'commander';
import { setupErrorHandlers, showIntro, select } from '@dotty/core';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerStatusCommand } from './commands/status.js';
import { registerDiffCommand } from './commands/diff.js';
import { registerApplyCommand } from './commands/apply.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerEditCommand } from './commands/edit.js';
import { registerAddCommand } from './commands/add.js';

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
registerDoctorCommand(program);
registerStatusCommand(program);
registerDiffCommand(program);
registerApplyCommand(program);
registerSyncCommand(program);
registerEditCommand(program);
registerAddCommand(program);

type CommandAction =
  | 'status'
  | 'sync'
  | 'diff'
  | 'apply'
  | 'doctor';

// If no subcommand provided, run interactive menu
program.action(async () => {
  showIntro('dotty');

  const action = await select<CommandAction>('What would you like to do?', [
    { value: 'status', label: 'Status', hint: 'Show dotfiles and git status' },
    { value: 'sync', label: 'Sync', hint: 'Pull and apply remote changes' },
    { value: 'diff', label: 'Diff', hint: 'Preview pending changes' },
    { value: 'apply', label: 'Apply', hint: 'Apply dotfiles to system' },
    { value: 'doctor', label: 'Doctor', hint: 'Check system health' },
  ]);

  // Re-parse with the selected command
  await program.parseAsync(['node', 'dotty', action]);
});

program.parseAsync();
