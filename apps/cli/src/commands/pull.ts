import { Command } from 'commander';
import chalk from 'chalk';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dotty/core';
import {
  loadDottyfileSafe,
  dottyfileExists,
  getDottyfilePath,
  writeDottyfile,
  addApp,
  createDefaultDottyfile,
  type Dottyfile,
  type App,
} from '@dotty/config';
import { loadProviders, type InstalledApp } from '@dotty/runtime';
import type { GlobalOptions } from '@dotty/core';

/**
 * Convert an InstalledApp from a provider to an App for the Dottyfile
 */
function installedAppToApp(
  installed: InstalledApp,
  providerName: string
): App {
  const app: App = {
    id: installed.id,
    name: installed.name,
  };

  if (providerName === 'homebrew') {
    const type = installed.meta?.type as 'formula' | 'cask' | undefined;
    if (type === 'cask') {
      app.homebrew = { cask: installed.id };
    } else {
      app.homebrew = { formula: installed.id };
    }
  } else if (providerName === 'mas') {
    // MAS apps need the numeric ID, which should be in installed.id
    const numericId = parseInt(installed.id, 10);
    if (!isNaN(numericId)) {
      app.mas = { id: numericId };
    }
  }

  return app;
}

export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Add installed apps to Dottyfile')
    .option('--all', 'Include all installed apps (not just new ones)')
    .action(async (options: { all?: boolean }) => {
      const opts = program.opts<GlobalOptions>();

      showIntro('dotty');

      // Load or create Dottyfile
      let config: Dottyfile;
      const exists = await dottyfileExists();

      if (exists) {
        const loaded = await loadDottyfileSafe();
        if (!loaded) {
          log.error(`Failed to parse Dottyfile at ${getDottyfilePath()}`);
          showOutro();
          return;
        }
        config = loaded;
      } else {
        log.warn(`No Dottyfile found at ${getDottyfilePath()}`);
        log.info('Creating a new Dottyfile...');
        config = createDefaultDottyfile();
      }

      // Load providers
      const providers = await loadProviders(config.providers);

      if (providers.size === 0) {
        log.warn('No providers available.');
        showOutro();
        return;
      }

      log.info(`Scanning providers: ${[...providers.keys()].join(', ')}`);

      // Get existing app IDs
      const existingIds = new Set(config.apps.map(a => a.id));

      // Collect new apps from all providers
      const newApps: { providerName: string; app: InstalledApp }[] = [];

      for (const [providerName, provider] of providers) {
        if (!(await provider.isAvailable())) {
          log.warn(`Provider ${providerName} is not available`);
          continue;
        }

        log.step(`Scanning ${providerName}...`);
        const installed = await provider.getInstalled();

        for (const app of installed) {
          if (options.all || !existingIds.has(app.id)) {
            newApps.push({ providerName, app });
          }
        }
      }

      if (newApps.length === 0) {
        log.success('No new apps to add');
        showOutro();
        return;
      }

      // Group by provider for display
      const grouped = new Map<string, InstalledApp[]>();
      for (const { providerName, app } of newApps) {
        const existing = grouped.get(providerName) || [];
        existing.push(app);
        grouped.set(providerName, existing);
      }

      // Display found apps
      log.step(`Found ${newApps.length} app(s) to add:`);
      console.log();

      for (const [providerName, apps] of grouped) {
        console.log(`  ${chalk.bold(providerName)}:`);
        for (const app of apps) {
          const typeInfo = app.meta?.type ? chalk.dim(` (${app.meta.type})`) : '';
          console.log(`    ${chalk.green('+')} ${app.name}${typeInfo}`);
        }
      }
      console.log();

      if (opts.dryRun) {
        dryRunLog('Would add the above apps to Dottyfile');
        showOutro();
        return;
      }

      // Confirm unless --yes flag
      if (!opts.yes) {
        const confirmed = await confirm('Add these apps to Dottyfile?', true);
        if (!confirmed) {
          showOutro('Cancelled');
          return;
        }
      }

      // Add apps to config
      let updatedConfig = config;
      for (const { providerName, app } of newApps) {
        const appEntry = installedAppToApp(app, providerName);
        updatedConfig = addApp(updatedConfig, appEntry);
      }

      // Write Dottyfile
      await writeDottyfile(updatedConfig);
      log.success(`Added ${newApps.length} app(s) to Dottyfile`);

      showOutro('Pull complete!');
    });
}
