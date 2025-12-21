import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { exec, execOutput, showIntro, showOutro, log } from '@dotty/core';
import { createChezmoiService } from '@dotty/chezmoi';

const PATHS = {
  dotfiles: path.join(os.homedir(), '.dotfiles'),
};

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show dotfiles and git status')
    .action(async () => {
      showIntro('dotty');

      const chezmoi = createChezmoiService();

      // Chezmoi status
      log.step('Chezmoi managed files...');
      const managedFiles = await chezmoi.getManagedFiles();
      console.log(chalk.dim(`  ${managedFiles.length} files managed by chezmoi`));

      // Chezmoi status (check for pending changes)
      const { files, runScripts } = await chezmoi.getStatus();

      if (files.length > 0) {
        log.warn(`${files.length} file change(s) pending. Run \`dotty diff\` to see details.`);
      } else {
        log.success('All files in sync');
      }

      if (runScripts.length > 0) {
        console.log(chalk.dim(`  ${runScripts.length} run script(s) will execute on apply`));
      }

      console.log();

      // Git status
      log.step('Git status...');
      const { stdout: gitStatus } = await exec('git', ['status', '--short'], {
        cwd: PATHS.dotfiles,
      });

      if (gitStatus.trim()) {
        console.log();
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
        console.log();
      } else {
        log.success('Working tree clean');
      }

      // Git branch info
      const branch = await execOutput('git', ['branch', '--show-current'], PATHS.dotfiles);
      const { stdout: aheadBehind } = await exec(
        'git',
        ['rev-list', '--left-right', '--count', `origin/${branch.trim()}...HEAD`],
        { cwd: PATHS.dotfiles }
      );

      if (aheadBehind.trim()) {
        const [behind, ahead] = aheadBehind.trim().split('\t').map(Number);
        const branchInfo = [];
        if (ahead > 0) branchInfo.push(chalk.green(`${ahead} ahead`));
        if (behind > 0) branchInfo.push(chalk.yellow(`${behind} behind`));

        if (branchInfo.length > 0) {
          console.log(
            chalk.dim(`  On branch ${branch.trim()}: ${branchInfo.join(', ')}`)
          );
        } else {
          console.log(chalk.dim(`  On branch ${branch.trim()}: up to date`));
        }
      }

      showOutro();
    });
}
