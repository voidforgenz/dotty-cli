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
 * Mac App Store provider - implements the Provider interface for mas CLI
 */
export class MasProvider implements Provider {
  readonly name = 'mas';

  /**
   * Check if mas CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return commandExists('mas');
  }

  /**
   * Get mas version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await exec('mas', ['version']);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all installed Mac App Store apps
   */
  async getInstalled(): Promise<InstalledApp[]> {
    try {
      const { stdout } = await exec('mas', ['list'], { silent: true });
      const lines = stdout.trim().split('\n').filter(Boolean);

      return lines.map((line) => {
        const match = line.match(/^(\d+)\s+(.+?)\s+\(/);
        if (match) {
          return { id: match[1], name: match[2] };
        }
        // Fallback parsing
        const parts = line.split(/\s+/);
        return { id: parts[0], name: parts.slice(1).join(' ') };
      });
    } catch {
      return [];
    }
  }

  /**
   * Check if an app is installed
   */
  async isInstalled(app: App): Promise<boolean> {
    const mas = app.mas;
    if (!mas) return false;

    try {
      const { stdout } = await exec('mas', ['list'], { silent: true });
      return stdout.includes(String(mas.id));
    } catch {
      return false;
    }
  }

  /**
   * Install an app
   */
  async install(app: App, options?: InstallOptions): Promise<ProviderResult> {
    const mas = app.mas;
    if (!mas) {
      return { success: false, error: 'No mas configuration for this app' };
    }

    if (options?.dryRun) {
      return { success: true };
    }

    const result = await exec('mas', ['install', String(mas.id)], {
      spinner: options?.spinner,
    });

    return {
      success: result.exitCode === 0,
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  /**
   * Uninstall an app
   * Note: mas doesn't support uninstalling - apps must be removed manually
   */
  async uninstall(_app: App, _options?: UninstallOptions): Promise<ProviderResult> {
    return {
      success: false,
      error: 'Mac App Store apps cannot be uninstalled via mas. Please remove manually from /Applications.',
    };
  }
}

/**
 * Create a Mac App Store provider instance
 */
export function createProvider(): Provider {
  return new MasProvider();
}
