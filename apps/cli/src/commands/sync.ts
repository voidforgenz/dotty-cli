import { Command } from 'commander';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';
import type { GlobalOptions } from '@dotty/core';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Pull and apply remote changes (chezmoi update)')
    .action(async () => {
      const opts = program.opts<GlobalOptions>();

      showIntro('dotty');

      if (opts.dryRun) {
        dryRunLog('Would pull latest changes and apply them');
        showOutro();
        return;
      }

      // Confirm unless --yes flag
      if (!opts.yes) {
        const confirmed = await confirm(
          'Pull latest changes from remote and apply?',
          true
        );
        if (!confirmed) {
          showOutro('Cancelled');
          return;
        }
      }

      log.step('Pulling latest changes...');

      const chezmoi = createChezmoiService();
      const result = await chezmoi.update({
        spinner: 'Syncing dotfiles...',
      });

      if (!result.success) {
        log.error('Failed to sync dotfiles');
        if (result.stderr) {
          console.error(result.stderr);
        }
        showOutro();
        process.exit(1);
      }

      log.success('Dotfiles synced successfully');
      showOutro();
    });
}
