import { exec, commandExists } from '@dotty/core';
import type { App } from '@dotty/config';
import type {
  Provider,
  ProviderResult,
  InstalledApp,
  InstallOptions,
  UninstallOptions,
} from '@dotty/runtime';

/**
 * Homebrew provider - implements the Provider interface for Homebrew
 */
export class HomebrewProvider implements Provider {
  readonly name = 'homebrew';

  /**
   * Check if Homebrew CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return commandExists('brew');
  }

  /**
   * Get Homebrew version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await exec('brew', ['--version']);
      return stdout.trim().split('\n')[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all installed formulas and casks
   */
  async getInstalled(): Promise<InstalledApp[]> {
    const apps: InstalledApp[] = [];

    // Get installed formulas
    try {
      const { stdout: formulas } = await exec('brew', ['list', '--formula', '-1'], {
        silent: true,
      });
      for (const name of formulas.trim().split('\n').filter(Boolean)) {
        apps.push({ id: name, name, meta: { type: 'formula' } });
      }
    } catch {
      // Ignore errors
    }

    // Get installed casks
    try {
      const { stdout: casks } = await exec('brew', ['list', '--cask', '-1'], {
        silent: true,
      });
      for (const name of casks.trim().split('\n').filter(Boolean)) {
        apps.push({ id: name, name, meta: { type: 'cask' } });
      }
    } catch {
      // Ignore errors
    }

    return apps;
  }

  /**
   * Check if an app is installed
   */
  async isInstalled(app: App): Promise<boolean> {
    const homebrew = app.homebrew;
    if (!homebrew) return false;

    if (homebrew.cask) {
      const { exitCode } = await exec('brew', ['list', '--cask', homebrew.cask], {
        silent: true,
      });
      return exitCode === 0;
    }

    if (homebrew.formula) {
      const { exitCode } = await exec('brew', ['list', '--formula', homebrew.formula], {
        silent: true,
      });
      return exitCode === 0;
    }

    return false;
  }

  /**
   * Install an app
   */
  async install(app: App, options?: InstallOptions): Promise<ProviderResult> {
    const homebrew = app.homebrew;
    if (!homebrew) {
      return { success: false, error: 'No homebrew configuration for this app' };
    }

    if (options?.dryRun) {
      return { success: true };
    }

    if (homebrew.cask) {
      const result = await exec('brew', ['install', '--cask', homebrew.cask], {
        spinner: options?.spinner,
      });
      return {
        success: result.exitCode === 0,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      };
    }

    if (homebrew.formula) {
      const result = await exec('brew', ['install', homebrew.formula], {
        spinner: options?.spinner,
      });
      return {
        success: result.exitCode === 0,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      };
    }

    return { success: false, error: 'No formula or cask specified' };
  }

  /**
   * Uninstall an app
   */
  async uninstall(app: App, options?: UninstallOptions): Promise<ProviderResult> {
    const homebrew = app.homebrew;
    if (!homebrew) {
      return { success: false, error: 'No homebrew configuration for this app' };
    }

    if (options?.dryRun) {
      return { success: true };
    }

    const args = ['uninstall'];
    if (options?.force) {
      args.push('--force');
    }

    if (homebrew.cask) {
      args.push('--cask', homebrew.cask);
    } else if (homebrew.formula) {
      args.push(homebrew.formula);
    } else {
      return { success: false, error: 'No formula or cask specified' };
    }

    const result = await exec('brew', args, {
      spinner: options?.spinner,
    });

    return {
      success: result.exitCode === 0,
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }
}

/**
 * Create a Homebrew provider instance
 */
export function createProvider(): Provider {
  return new HomebrewProvider();
}
