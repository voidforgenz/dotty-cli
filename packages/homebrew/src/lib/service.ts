import { exec, execStream, commandExists } from '@dottyfiles/core';

/**
 * Homebrew service - provides wrapper functionality for Homebrew operations
 */
export class HomebrewService {

  /**
   * Check if Homebrew is installed
   */
  async isInstalled(): Promise<boolean> {
    return commandExists('brew');
  }

  /**
   * Get Homebrew version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await exec('brew', ['--version']);
      return stdout.trim().split('\n')[0];
    } catch {
      return null;
    }
  }

  /**
   * Install Homebrew
   */
  async install(): Promise<number> {
    return execStream('/bin/bash', [
      '-c',
      '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)',
    ]);
  }

  /**
   * Install a formula
   */
  async installFormula(
    formula: string,
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('brew', ['install', formula], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Install a cask
   */
  async installCask(
    cask: string,
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('brew', ['install', '--cask', cask], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Check if a cask is installed
   */
  async isCaskInstalled(cask: string): Promise<boolean> {
    const { exitCode } = await exec('brew', ['list', '--cask', cask], {
      silent: true,
    });
    return exitCode === 0;
  }

  /**
   * Run brew bundle with a Brewfile
   */
  async bundle(
    brewfilePath: string,
    options: { silent?: boolean } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('brew', ['bundle', `--file=${brewfilePath}`], {
      silent: options.silent,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Get list of installed casks
   */
  async getInstalledCasks(): Promise<string[]> {
    const { stdout } = await exec('brew', ['list', '--cask']);
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Get list of installed formulas
   */
  async getInstalledFormulas(): Promise<string[]> {
    const { stdout } = await exec('brew', ['list', '--formula']);
    return stdout.trim().split('\n').filter(Boolean);
  }
}

/**
 * Create a default homebrew service instance
 */
export function createHomebrewService(): HomebrewService {
  return new HomebrewService();
}
