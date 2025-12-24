import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  commandExists,
  execOutput,
  showIntro,
  showOutro,
  log,
  check,
  cross,
  warning,
} from '@dottyfiles/core';
import type { CheckResult } from '@dottyfiles/core';

// Default paths - these would typically come from config
const PATHS = {
  dotfiles: path.join(os.homedir(), '.dotfiles'),
  chezmoi: path.join(os.homedir(), '.local/share/chezmoi'),
  zshPlugins: path.join(os.homedir(), '.zsh'),
  tpm: path.join(os.homedir(), '.tmux/plugins/tpm'),
};

async function checkCommand(
  name: string,
  versionArg = '--version'
): Promise<CheckResult> {
  const exists = await commandExists(name);
  if (!exists) {
    return { name, status: 'error', message: `${name} not found` };
  }

  try {
    const version = await execOutput(name, [versionArg]);
    const firstLine = version.trim().split('\n')[0];
    return { name, status: 'ok', message: 'Installed', version: firstLine };
  } catch {
    return { name, status: 'ok', message: 'Installed (version unknown)' };
  }
}

async function checkDirectory(name: string, dirPath: string): Promise<CheckResult> {
  try {
    await fs.access(dirPath);
    return { name, status: 'ok', message: dirPath };
  } catch {
    return { name, status: 'error', message: `Not found: ${dirPath}` };
  }
}

async function getPackageVersion(packageName: string): Promise<string | null> {
  try {
    // Try to dynamically import the package's package.json
    const pkgPath = await import.meta.resolve?.(`${packageName}/package.json`);
    if (pkgPath) {
      const pkg = await fs.readFile(new URL(pkgPath), 'utf-8');
      return JSON.parse(pkg).version;
    }
  } catch {
    // Fallback: try reading from node_modules
    try {
      const modulePath = `node_modules/${packageName}/package.json`;
      const pkg = await fs.readFile(modulePath, 'utf-8');
      return JSON.parse(pkg).version;
    } catch {
      return null;
    }
  }
  return null;
}

async function checkPackageVersions(cliVersion: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const packages = ['@dottyfiles/core', '@dottyfiles/chezmoi', '@dottyfiles/homebrew', '@dottyfiles/mas'];

  for (const pkg of packages) {
    const version = await getPackageVersion(pkg);

    if (!version) {
      results.push({
        name: pkg,
        status: 'warning',
        message: 'Could not determine version',
      });
    } else if (version !== cliVersion) {
      results.push({
        name: pkg,
        status: 'error',
        message: `Version mismatch (${version} vs CLI ${cliVersion})`,
        version,
      });
    } else {
      results.push({
        name: pkg,
        status: 'ok',
        message: 'Version matches',
        version,
      });
    }
  }

  return results;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check system health and dependencies')
    .action(async () => {
      showIntro('dotty');

      log.step('Checking system health...');

      const checks: CheckResult[] = await Promise.all([
        // Core tools
        checkCommand('brew'),
        checkCommand('chezmoi'),
        checkCommand('git'),
        checkCommand('node'),
        checkCommand('pnpm'),

        // Optional tools
        checkCommand('dockutil'),
        checkCommand('mas'),

        // Directories
        checkDirectory('Dotfiles', PATHS.dotfiles),
        checkDirectory('Chezmoi source', PATHS.chezmoi),
        checkDirectory('TPM', PATHS.tpm),
        checkDirectory('zsh-autosuggestions', `${PATHS.zshPlugins}/zsh-autosuggestions`),
        checkDirectory('zsh-completions', `${PATHS.zshPlugins}/zsh-completions`),
        checkDirectory('fzf-tab', `${PATHS.zshPlugins}/fzf-tab`),
      ]);

      console.log();
      console.log(chalk.bold('  Core Tools'));

      // Display core tools (first 5)
      for (const result of checks.slice(0, 5)) {
        const version = result.version ? chalk.dim(` ${result.version}`) : '';
        if (result.status === 'ok') {
          check(`${result.name}${version}`);
        } else if (result.status === 'warning') {
          warning(`${result.name}: ${result.message}`);
        } else {
          cross(`${result.name}: ${result.message}`);
        }
      }

      console.log();
      console.log(chalk.bold('  Optional Tools'));

      // Display optional tools (next 2)
      for (const result of checks.slice(5, 7)) {
        const version = result.version ? chalk.dim(` ${result.version}`) : '';
        if (result.status === 'ok') {
          check(`${result.name}${version}`);
        } else {
          warning(`${result.name}: ${result.message} ${chalk.dim('(optional)')}`);
        }
      }

      console.log();
      console.log(chalk.bold('  Directories'));

      // Display directory checks (rest)
      for (const result of checks.slice(7)) {
        if (result.status === 'ok') {
          check(result.name);
        } else {
          cross(`${result.name}: ${result.message}`);
        }
      }

      // Check package versions
      console.log();
      console.log(chalk.bold('  Package Versions'));

      // Get CLI version from program
      const cliVersion = program.version() || '0.1.0';
      const versionChecks = await checkPackageVersions(cliVersion);
      for (const result of versionChecks) {
        const version = result.version ? chalk.dim(` v${result.version}`) : '';
        if (result.status === 'ok') {
          check(`${result.name}${version}`);
        } else if (result.status === 'warning') {
          warning(`${result.name}: ${result.message}`);
        } else {
          cross(`${result.name}: ${result.message}`);
        }
      }

      console.log();

      // Summary
      const errors = checks.filter((c) => c.status === 'error');
      const coreErrors = checks.slice(0, 5).filter((c) => c.status === 'error');

      if (coreErrors.length > 0) {
        log.error(
          `${coreErrors.length} core dependency issue(s) found.`
        );
      } else if (errors.length > 0) {
        log.warn(
          `${errors.length} issue(s) found.`
        );
      } else {
        log.success('All checks passed!');
      }

      showOutro();
    });
}
