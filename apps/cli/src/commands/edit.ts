import { Command } from 'commander';
import { showIntro, showOutro, log } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';

export function registerEditCommand(program: Command): void {
  program
    .command('edit')
    .description('Edit a dotfile (chezmoi edit)')
    .argument('<file>', 'File to edit (e.g., ~/.zshrc)')
    .action(async (file: string) => {
      showIntro('dotty');

      log.step(`Opening ${file} for editing...`);
      console.log();

      const chezmoi = createChezmoiService();
      const exitCode = await chezmoi.edit(file);

      console.log();

      if (exitCode === 0) {
        log.info("File saved. Run 'dotty apply' to apply changes.");
      } else {
        log.error('Failed to edit file');
      }

      showOutro();
    });
}
