import { Command } from 'commander';
import chalk from 'chalk';
import { exec, execOutput, showIntro, showOutro, log } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';
import {
  loadDottyfileSafe,
  getDottyDir,
  getDottyfilePath,
  getActiveApps,
} from '@dotty/config';
import {
  loadProviders,
  resolveAllApps,
  findMissingApps,
  groupByProvider,
} from '@dotty/runtime';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show Dottyfile and system status')
    .action(async () => {
      showIntro('dotty');

      const dottyDir = getDottyDir();

      // Load Dottyfile
      const config = await loadDottyfileSafe();

      if (!config) {
        log.warn(`No Dottyfile found at ${getDottyfilePath()}`);
        log.info('Run `dotty init` to create one.');
        showOutro();
        return;
      }

      // Dottyfile status
      log.step('Dottyfile');
      const activeApps = getActiveApps(config);
      console.log(chalk.dim(`  ${activeApps.length} app(s) configured`));
      console.log(chalk.dim(`  Providers: ${config.providers.join(', ')}`));
      if (config.profiles?.active) {
        console.log(chalk.dim(`  Active profiles: ${config.profiles.active.join(', ')}`));
      }
      console.log();

      // Load providers and check for missing apps
      const providers = await loadProviders(config.providers);

      if (providers.size > 0 && activeApps.length > 0) {
        log.step('Apps');

        const { resolved, unresolved } = await resolveAllApps(
          activeApps,
          config.providers,
          providers
        );

        const missing = await findMissingApps(resolved);

        if (missing.length === 0 && unresolved.length === 0) {
          log.success('All apps installed');
        } else {
          if (missing.length > 0) {
            log.warn(`${missing.length} app(s) not installed:`);
            const grouped = groupByProvider(missing);
            for (const [providerName, apps] of grouped) {
              for (const { app } of apps) {
                console.log(`  ${chalk.yellow('○')} ${app.name || app.id} ${chalk.dim(`(${providerName})`)}`);
              }
            }
          }

          if (unresolved.length > 0) {
            log.warn(`${unresolved.length} app(s) could not be resolved:`);
            for (const app of unresolved) {
              console.log(`  ${chalk.red('?')} ${app.name || app.id}`);
            }
          }
        }
        console.log();
      }

      // Chezmoi status
      const chezmoi = createChezmoiService();
      const chezmoiAvailable = await chezmoi.isInstalled();

      if (chezmoiAvailable) {
        log.step('Dotfiles (chezmoi)');
        const managedFiles = await chezmoi.getManagedFiles();
        console.log(chalk.dim(`  ${managedFiles.length} file(s) managed`));

        const { files, runScripts } = await chezmoi.getStatus();

        if (files.length > 0) {
          log.warn(`${files.length} file change(s) pending`);
        } else {
          log.success('All files in sync');
        }

        if (runScripts.length > 0) {
          console.log(chalk.dim(`  ${runScripts.length} run script(s) will execute on apply`));
        }
        console.log();
      }

      // Git status of ~/.dotty
      log.step('Git status');
      try {
        const { stdout: gitStatus, exitCode } = await exec('git', ['status', '--short'], {
          cwd: dottyDir,
          silent: true,
        });

        if (exitCode !== 0) {
          console.log(chalk.dim('  Not a git repository'));
        } else if (gitStatus.trim()) {
          for (const line of gitStatus.trim().split('\n')) {
            const status = line.slice(0, 2);
            const file = line.slice(3);

            let icon = chalk.dim('?');
            if (status.includes('M')) icon = chalk.yellow('M');
            if (status.includes('A')) icon = chalk.green('A');
            if (status.includes('D')) icon = chalk.red('D');
            if (status.includes('?')) icon = chalk.gray('?');

            console.log(`  ${icon} ${file}`);
          }
        } else {
          log.success('Working tree clean');
        }

        // Git branch info
        const branch = await execOutput('git', ['branch', '--show-current'], dottyDir);
        if (branch.trim()) {
          const { stdout: aheadBehind } = await exec(
            'git',
            ['rev-list', '--left-right', '--count', `origin/${branch.trim()}...HEAD`],
            { cwd: dottyDir, silent: true }
          );

          if (aheadBehind.trim()) {
            const [behind, ahead] = aheadBehind.trim().split('\t').map(Number);
            const branchInfo = [];
            if (ahead > 0) branchInfo.push(chalk.green(`${ahead} ahead`));
            if (behind > 0) branchInfo.push(chalk.yellow(`${behind} behind`));

            if (branchInfo.length > 0) {
              console.log(chalk.dim(`  On branch ${branch.trim()}: ${branchInfo.join(', ')}`));
            } else {
              console.log(chalk.dim(`  On branch ${branch.trim()}: up to date`));
            }
          }
        }
      } catch {
        console.log(chalk.dim('  Git not available or not a repository'));
      }

      showOutro();
    });
}
