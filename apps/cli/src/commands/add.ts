import { Command } from 'commander';
import { dryRunLog, showIntro, showOutro, log, confirm } from '@dottyfiles/core';
import { createChezmoiService } from '@dottyfiles/chezmoi';
import type { GlobalOptions } from '@dottyfiles/core';

export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description('Add a file to chezmoi management')
    .argument('<file>', 'File to add (e.g., ~/.newconfig)')
    .action(async (file: string) => {
      const opts = program.opts<GlobalOptions>();

      showIntro('dotty');

      if (opts.dryRun) {
        dryRunLog(`Would add ${file} to chezmoi management`);
        showOutro();
        return;
      }

      // Confirm unless --yes flag
      if (!opts.yes) {
        const confirmed = await confirm(
          `Add ${file} to chezmoi management?`,
          true
        );
        if (!confirmed) {
          showOutro('Cancelled');
          return;
        }
      }

      const chezmoi = createChezmoiService();
      const result = await chezmoi.add(file, {
        spinner: `Adding ${file}...`,
      });

      if (!result.success) {
        log.error(`Failed to add ${file}`);
        if (result.stderr) {
          console.error(result.stderr);
        }
        showOutro();
        process.exit(1);
      }

      log.success(`Added ${file} to chezmoi management`);
      log.info("Don't forget to commit the changes to git!");
      showOutro();
    });
}
