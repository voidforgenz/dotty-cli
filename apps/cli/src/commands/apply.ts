import { Command } from 'commander';
import chalk from 'chalk';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';
import {
  loadDottyfile,
  dottyfileExists,
  getActiveApps,
  getDottyfilePath,
  type Dottyfile,
} from '@dotty/config';
import {
  loadProviders,
  resolveAllApps,
  findMissingApps,
  groupByProvider,
  type ResolvedApp,
} from '@dotty/runtime';
import { applyMacosSettings } from '@dotty/macos';
import type { GlobalOptions } from '@dotty/core';

export function registerApplyCommand(program: Command): void {
  program
    .command('apply')
    .description('Apply Dottyfile to system (install missing apps)')
    .action(async () => {
      const opts = program.opts<GlobalOptions>();

      showIntro('dotty');

      // Check if Dottyfile exists
      if (!(await dottyfileExists())) {
        log.error(`No Dottyfile found at ${getDottyfilePath()}`);
        log.info('Run `dotty init` to create one.');
        showOutro();
        return;
      }

      // Load Dottyfile
      let config;
      try {
        config = await loadDottyfile();
      } catch (error) {
        log.error('Failed to parse Dottyfile:');
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ${chalk.red('•')} ${message}`);
        showOutro();
        return;
      }

      // Get active apps based on profiles
      const activeApps = getActiveApps(config);

      if (activeApps.length === 0) {
        log.info('No apps configured in Dottyfile.');
        log.info('Add apps to your Dottyfile and run `dotty apply` again.');
        showOutro();
        return;
      }

      log.step(`Found ${activeApps.length} app(s) in Dottyfile`);

      // Load providers
      const providers = await loadProviders(config.providers);

      if (providers.size === 0) {
        log.warn('No providers available. Install provider packages first.');
        showOutro();
        return;
      }

      log.info(`Loaded providers: ${[...providers.keys()].join(', ')}`);

      // Resolve apps to providers
      const { resolved, unresolved } = await resolveAllApps(
        activeApps,
        config.providers,
        providers
      );

      if (unresolved.length > 0) {
        log.warn(`Could not resolve ${unresolved.length} app(s):`);
        for (const app of unresolved) {
          console.log(`  ${chalk.yellow('•')} ${app.name || app.id}`);
        }
      }

      // Find missing apps
      const missing = await findMissingApps(resolved);

      if (missing.length === 0) {
        log.success('All apps are already installed!');
      } else {
        log.step(`${missing.length} app(s) to install:`);

        // Group by provider for display
        const grouped = groupByProvider(missing);

        for (const [providerName, apps] of grouped) {
          console.log();
          console.log(`  ${chalk.bold(providerName)}:`);
          for (const { app } of apps) {
            console.log(`    ${chalk.cyan('+')} ${app.name || app.id}`);
          }
        }
        console.log();

        if (opts.dryRun) {
          dryRunLog('Would install the above apps');
        } else {
          // Confirm unless --yes flag
          if (!opts.yes) {
            const confirmed = await confirm('Install these apps?', true);
            if (!confirmed) {
              showOutro('Cancelled');
              return;
            }
          }

          // Install apps
          await installApps(missing, opts);
        }
      }

      // Apply macOS system settings
      await applySystemSettings(config, opts);

      // Apply dotfiles via chezmoi (if available)
      await applyDotfiles(opts);

      showOutro('Apply complete!');
    });
}

async function installApps(
  missing: ResolvedApp[],
  opts: GlobalOptions
): Promise<void> {
  const grouped = groupByProvider(missing);

  for (const [providerName, apps] of grouped) {
    log.step(`Installing via ${providerName}...`);

    for (const { app, provider } of apps) {
      const appName = app.name || app.id;

      try {
        const result = await provider.install(app, {
          dryRun: opts.dryRun,
          spinner: `Installing ${appName}...`,
        });

        if (result.success) {
          log.success(`Installed ${appName}`);
        } else {
          log.error(`Failed to install ${appName}: ${result.error}`);
        }
      } catch (error) {
        log.error(`Error installing ${appName}: ${error}`);
      }
    }
  }
}

async function applySystemSettings(
  config: Dottyfile,
  opts: GlobalOptions
): Promise<void> {
  const hasSettings = config.dock || config.keyboard || config.trackpad || config.mouse;

  if (!hasSettings) {
    return;
  }

  console.log();
  log.step('macOS system settings:');

  const sections: string[] = [];
  if (config.dock) sections.push('dock');
  if (config.keyboard) sections.push('keyboard');
  if (config.trackpad) sections.push('trackpad');
  if (config.mouse) sections.push('mouse');

  console.log(chalk.dim(`  Sections: ${sections.join(', ')}`));

  if (opts.dryRun) {
    dryRunLog('Would apply macOS settings');
    return;
  }

  const result = await applyMacosSettings(
    {
      dock: config.dock,
      keyboard: config.keyboard,
      trackpad: config.trackpad,
      mouse: config.mouse,
    },
    { dryRun: opts.dryRun }
  );

  if (result.hasErrors) {
    if (result.dock?.error) {
      log.error(`Dock: ${result.dock.error}`);
    }
    if (result.keyboard?.error) {
      log.error(`Keyboard: ${result.keyboard.error}`);
    }
    if (result.trackpad?.error) {
      log.error(`Trackpad: ${result.trackpad.error}`);
    }
    if (result.mouse?.error) {
      log.error(`Mouse: ${result.mouse.error}`);
    }
  }

  if (result.hasChanges) {
    log.success('macOS settings applied');
  } else {
    log.info('No macOS settings changes needed');
  }
}

async function applyDotfiles(opts: GlobalOptions): Promise<void> {
  const chezmoi = createChezmoiService();

  // Check if chezmoi is available
  const available = await chezmoi.isInstalled();
  if (!available) {
    return; // Silently skip if chezmoi not installed
  }

  const { files, runScripts } = await chezmoi.getStatus();

  if (files.length === 0 && runScripts.length === 0) {
    return; // No dotfile changes
  }

  console.log();
  log.step('Dotfile changes:');

  if (files.length > 0) {
    await chezmoi.showDiff();
  }

  if (runScripts.length > 0) {
    console.log();
    log.info('Scripts to execute:');
    for (const script of runScripts) {
      const scriptName = script.replace(/^R\s+/, '').replace(/^\s+R\s+/, '').trim();
      console.log(`  ${chalk.cyan('→')} ${scriptName}`);
    }
  }

  console.log();

  if (opts.dryRun) {
    dryRunLog('Would apply dotfile changes');
    return;
  }

  // Confirm unless --yes flag
  if (!opts.yes) {
    const confirmed = await confirm('Apply dotfile changes?', true);
    if (!confirmed) {
      return;
    }
  }

  const result = await chezmoi.apply({
    spinner: 'Applying dotfiles...',
  });

  if (result.success) {
    log.success('Dotfiles applied');
  } else {
    log.error('Failed to apply dotfiles');
    if (result.stderr) {
      console.error(result.stderr);
    }
  }
}
