import { Command } from 'commander';
import chalk from 'chalk';
import { dryRunLog, showIntro, showOutro, log, confirm, runHooks } from '@dottyfiles/core';
import { createChezmoiService } from '@dottyfiles/chezmoi';
import {
  loadDottyfile,
  dottyfileExists,
  getActiveApps,
  getDottyfilePath,
  getEffectiveSettings,
  type ProfileSettings,
} from '@dottyfiles/config';
import {
  loadProviders,
  resolveAllApps,
  findMissingApps,
  findExtraApps,
  groupByProvider,
  type ResolvedApp,
  type InstalledApp,
  type Provider,
} from '@dottyfiles/runtime';
import { applyMacosSettings } from '@dottyfiles/macos';
import type { GlobalOptions } from '@dottyfiles/core';

export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Sync machine to Dottyfile (install missing, uninstall extra)')
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

      // Run pre hooks
      if (config.run?.pre && config.run.pre.length > 0) {
        console.log();
        const preResult = await runHooks(config.run.pre, 'pre', { dryRun: opts.dryRun });
        if (!preResult.success) {
          log.error('Pre hooks failed, aborting push');
          showOutro();
          return;
        }
      }

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

      // Find missing apps (to install)
      const missing = await findMissingApps(resolved);

      // Find extra apps (to uninstall)
      const extraApps = await findExtraApps(config, providers);
      const totalExtra = extraApps.reduce((sum, e) => sum + e.apps.length, 0);

      // Check destructive mode
      const destructiveMode = config.defaults?.destructive || 'prompt';

      if (missing.length === 0 && totalExtra === 0) {
        log.success('Machine is in sync with Dottyfile!');
        showOutro();
        return;
      }

      // Show missing apps
      if (missing.length > 0) {
        log.step(`${missing.length} app(s) to install:`);
        const grouped = groupByProvider(missing);

        for (const [providerName, apps] of grouped) {
          console.log();
          console.log(`  ${chalk.bold(providerName)}:`);
          for (const { app } of apps) {
            console.log(`    ${chalk.green('+')} ${app.name || app.id}`);
          }
        }
        console.log();
      }

      // Show extra apps
      if (totalExtra > 0) {
        if (destructiveMode === 'never') {
          log.info(`${totalExtra} extra app(s) installed (not removing - destructive=never)`);
        } else {
          log.warn(`${totalExtra} app(s) to uninstall:`);

          for (const { providerName, apps } of extraApps) {
            console.log();
            console.log(`  ${chalk.bold(providerName)}:`);
            for (const app of apps) {
              const typeInfo = app.meta?.type ? chalk.dim(` (${app.meta.type})`) : '';
              console.log(`    ${chalk.red('-')} ${app.name}${typeInfo}`);
            }
          }
          console.log();
        }
      }

      if (opts.dryRun) {
        if (missing.length > 0) {
          dryRunLog('Would install the above apps');
        }
        if (totalExtra > 0 && destructiveMode !== 'never') {
          dryRunLog('Would uninstall the above apps');
        }
        showOutro();
        return;
      }

      // Install missing apps
      if (missing.length > 0) {
        if (!opts.yes) {
          const confirmed = await confirm('Install missing apps?', true);
          if (!confirmed) {
            log.info('Skipping installation');
          } else {
            await installApps(missing, opts);
          }
        } else {
          await installApps(missing, opts);
        }
      }

      // Uninstall extra apps
      if (totalExtra > 0 && destructiveMode !== 'never') {
        let shouldUninstall = false;

        if (destructiveMode === 'always') {
          shouldUninstall = true;
        } else if (!opts.yes) {
          shouldUninstall = await confirm(
            `Uninstall ${totalExtra} extra app(s)?`,
            false // Default to no for destructive operations
          );
        } else {
          // --yes flag with prompt mode still asks for destructive
          shouldUninstall = await confirm(
            `Uninstall ${totalExtra} extra app(s)?`,
            false
          );
        }

        if (shouldUninstall) {
          await uninstallApps(extraApps, providers, opts);
        } else {
          log.info('Skipping uninstallation');
        }
      }

      // Apply macOS system settings (using effective profile settings)
      const effectiveSettings = getEffectiveSettings(config);
      await applySystemSettings(effectiveSettings, opts);

      // Apply dotfiles via chezmoi (if available)
      await applyDotfiles(opts);

      // Run post hooks
      if (config.run?.post && config.run.post.length > 0) {
        console.log();
        await runHooks(config.run.post, 'post', { dryRun: opts.dryRun });
      }

      showOutro('Push complete!');
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

async function uninstallApps(
  extraApps: { providerName: string; apps: InstalledApp[] }[],
  providers: Map<string, Provider>,
  opts: GlobalOptions
): Promise<void> {
  for (const { providerName, apps } of extraApps) {
    const provider = providers.get(providerName);
    if (!provider) continue;

    log.step(`Uninstalling via ${providerName}...`);

    for (const installedApp of apps) {
      const appName = installedApp.name;

      // Convert InstalledApp to App format for uninstall
      const app = installedAppToApp(installedApp, providerName);

      try {
        const result = await provider.uninstall(app, {
          dryRun: opts.dryRun,
          spinner: `Uninstalling ${appName}...`,
        });

        if (result.success) {
          log.success(`Uninstalled ${appName}`);
        } else {
          log.error(`Failed to uninstall ${appName}: ${result.error}`);
        }
      } catch (error) {
        log.error(`Error uninstalling ${appName}: ${error}`);
      }
    }
  }
}

/**
 * Convert an InstalledApp to App format for provider operations
 */
function installedAppToApp(
  installed: InstalledApp,
  providerName: string
): { id: string; name: string; homebrew?: { formula?: string; cask?: string }; mas?: { id: number } } {
  const app: { id: string; name: string; homebrew?: { formula?: string; cask?: string }; mas?: { id: number } } = {
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
    const numericId = parseInt(installed.id, 10);
    if (!isNaN(numericId)) {
      app.mas = { id: numericId };
    }
  }

  return app;
}

async function applySystemSettings(
  settings: ProfileSettings,
  opts: GlobalOptions
): Promise<void> {
  const hasSettings = settings.dock || settings.keyboard || settings.trackpad || settings.mouse;

  if (!hasSettings) {
    return;
  }

  console.log();
  log.step('macOS system settings:');

  const sections: string[] = [];
  if (settings.dock) sections.push('dock');
  if (settings.keyboard) sections.push('keyboard');
  if (settings.trackpad) sections.push('trackpad');
  if (settings.mouse) sections.push('mouse');

  console.log(chalk.dim(`  Sections: ${sections.join(', ')}`));

  if (opts.dryRun) {
    dryRunLog('Would apply macOS settings');
    return;
  }

  const result = await applyMacosSettings(
    {
      dock: settings.dock,
      keyboard: settings.keyboard,
      trackpad: settings.trackpad,
      mouse: settings.mouse,
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
    return;
  }

  const { files, runScripts } = await chezmoi.getStatus();

  if (files.length === 0 && runScripts.length === 0) {
    return;
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
