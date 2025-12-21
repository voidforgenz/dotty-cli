import { Command } from 'commander';
import { showIntro, showOutro, log } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Show pending changes (chezmoi diff)')
    .action(async () => {
      showIntro('dotty');

      log.step('Checking for pending changes...');
      console.log();

      const chezmoi = createChezmoiService();
      const exitCode = await chezmoi.showDiff();

      console.log();

      if (exitCode === 0) {
        log.success('No pending changes');
      } else {
        log.info("Run 'dotty apply' to apply these changes");
      }

      showOutro();
    });
}
