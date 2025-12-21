import { Command } from 'commander';
import chalk from 'chalk';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';
import type { GlobalOptions } from '@dotty/core';

// Descriptions for known run scripts
const SCRIPT_DESCRIPTIONS: Record<string, string> = {
  'configure-dock.sh': 'Configure macOS Dock with predefined apps',
  'install-tmux-plugins.sh': 'Install tmux plugin manager (TPM) if missing',
  'uninstall-manual-apps.sh': 'Remove manually installed apps not in Brewfile',
};

export function registerApplyCommand(program: Command): void {
  program
    .command('apply')
    .description('Apply dotfiles to system (chezmoi apply)')
    .action(async () => {
      const opts = program.opts<GlobalOptions>();

      showIntro('dotty');

      const chezmoi = createChezmoiService();
      const { files, runScripts } = await chezmoi.getStatus();

      if (files.length === 0 && runScripts.length === 0) {
        log.success('No changes to apply');
        showOutro();
        return;
      }

      // Show what will change
      if (files.length > 0) {
        log.step('File changes to apply:');
        console.log();
        await chezmoi.showDiff();
        console.log();
      }

      if (runScripts.length > 0) {
        log.step('Scripts to execute:');
        console.log();
        for (const line of runScripts) {
          // Extract script name from status line
          const scriptName = line.replace(/^R\s+/, '').replace(/^\s+R\s+/, '').trim();
          const description = SCRIPT_DESCRIPTIONS[scriptName] || 'Run script';
          console.log(`  ${chalk.cyan('→')} ${chalk.bold(scriptName)}`);
          console.log(`    ${chalk.dim(description)}`);
        }
        console.log();
      }

      if (opts.dryRun) {
        dryRunLog('Would apply the above changes');
        showOutro();
        return;
      }

      // Confirm unless --yes flag
      if (!opts.yes) {
        const confirmed = await confirm('Apply these changes?', true);
        if (!confirmed) {
          showOutro('Cancelled');
          return;
        }
      }

      // Apply changes
      const result = await chezmoi.apply({
        spinner: 'Applying changes...',
      });

      if (!result.success) {
        log.error('Failed to apply changes');
        if (result.stderr) {
          console.error(result.stderr);
        }
        showOutro();
        process.exit(1);
      }

      log.success('Changes applied successfully');
      showOutro();
    });
}
