import { Command } from 'commander';
import chalk from 'chalk';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dottyfiles/core';
import { dottyfileExists, getDottyfilePath } from '@dottyfiles/config';
import {
  CURRENT_SCHEMA_VERSION,
  checkMigrationsNeeded,
  runMigrations,
  readMigrationHistory,
} from '@dottyfiles/runtime';
import type { GlobalOptions } from '@dottyfiles/core';

export function registerMigrateCommand(program: Command): void {
  const migrateCmd = program
    .command('migrate')
    .description('Migrate Dottyfile to latest schema version');

  // Default action - run migrations
  migrateCmd.action(async () => {
    const opts = program.opts<GlobalOptions>();

    showIntro('dotty');

    // Check if Dottyfile exists
    if (!(await dottyfileExists())) {
      log.error(`No Dottyfile found at ${getDottyfilePath()}`);
      log.info('Run `dotty init` to create one.');
      showOutro();
      return;
    }

    // Check if migrations are needed
    const status = await checkMigrationsNeeded();

    if (!status.needed) {
      log.success(`Dottyfile is up to date (version ${status.currentVersion})`);
      showOutro();
      return;
    }

    log.step(`Dottyfile version: ${status.currentVersion} → ${status.targetVersion}`);
    console.log();
    log.info('Pending migrations:');

    for (const migration of status.migrations) {
      console.log(`  ${chalk.cyan('→')} v${migration.from} → v${migration.to}: ${migration.description}`);
    }
    console.log();

    if (opts.dryRun) {
      dryRunLog('Would apply the above migrations');
      showOutro();
      return;
    }

    // Confirm unless --yes flag
    if (!opts.yes) {
      const confirmed = await confirm('Apply migrations?', true);
      if (!confirmed) {
        showOutro('Cancelled');
        return;
      }
    }

    // Run migrations
    const result = await runMigrations({ dryRun: opts.dryRun });

    if (result.success) {
      log.success(`Migrated from v${result.fromVersion} to v${result.toVersion}`);
      for (const record of result.applied) {
        console.log(`  ${chalk.green('✓')} ${record.description}`);
      }
    } else {
      log.error(`Migration failed: ${result.error}`);
      if (result.applied.length > 0) {
        log.info('Partially applied migrations:');
        for (const record of result.applied) {
          console.log(`  ${chalk.green('✓')} ${record.description}`);
        }
      }
    }

    showOutro();
  });

  // Subcommand: migrate status
  migrateCmd
    .command('status')
    .description('Check if migrations are needed')
    .action(async () => {
      showIntro('dotty');

      if (!(await dottyfileExists())) {
        log.error(`No Dottyfile found at ${getDottyfilePath()}`);
        showOutro();
        return;
      }

      const status = await checkMigrationsNeeded();

      console.log();
      console.log(`  ${chalk.bold('Current version:')} ${status.currentVersion}`);
      console.log(`  ${chalk.bold('Latest version:')}  ${CURRENT_SCHEMA_VERSION}`);
      console.log();

      if (status.needed) {
        log.warn(`${status.migrations.length} migration(s) pending`);
        console.log();
        for (const migration of status.migrations) {
          console.log(`  ${chalk.yellow('○')} v${migration.from} → v${migration.to}: ${migration.description}`);
        }
        console.log();
        log.info('Run `dotty migrate` to apply');
      } else {
        log.success('Dottyfile is up to date');
      }

      showOutro();
    });

  // Subcommand: migrate history
  migrateCmd
    .command('history')
    .description('Show migration history')
    .action(async () => {
      showIntro('dotty');

      const history = await readMigrationHistory();

      if (history.length === 0) {
        log.info('No migrations have been applied');
        showOutro();
        return;
      }

      log.step(`${history.length} migration(s) applied:`);
      console.log();

      for (const record of history) {
        const date = new Date(record.timestamp).toLocaleDateString();
        console.log(`  ${chalk.green('✓')} ${chalk.dim(date)} v${record.from} → v${record.to}`);
        console.log(`    ${record.description}`);
      }

      showOutro();
    });
}
