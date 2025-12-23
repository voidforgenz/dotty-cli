import { exec, commandExists } from '@dotty/core';

export interface MasApp {
  id: string;
  name: string;
}

/**
 * Mac App Store (mas) service - provides wrapper functionality for mas operations
 */
export class MasService {
  /**
   * Check if mas is installed
   */
  async isInstalled(): Promise<boolean> {
    return commandExists('mas');
  }

  /**
   * Get mas version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await exec('mas', ['version']);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Get list of installed apps
   */
  async getInstalledApps(): Promise<MasApp[]> {
    const { stdout } = await exec('mas', ['list'], { silent: true });
    const lines = stdout.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s+\(/);
      if (match) {
        return { id: match[1], name: match[2] };
      }
      // Fallback parsing
      const parts = line.trim().split(/\s+/);
      return { id: parts[0], name: parts.slice(1).join(' ') };
    });
  }

  /**
   * Check if an app is installed by ID
   */
  async isAppInstalled(appId: string): Promise<boolean> {
    const { stdout } = await exec('mas', ['list'], { silent: true });
    return stdout.includes(appId);
  }

  /**
   * Install an app by ID
   */
  async install(
    appId: string,
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('mas', ['install', appId], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Search for apps
   */
  async search(query: string): Promise<MasApp[]> {
    const { stdout } = await exec('mas', ['search', query], { silent: true });
    const lines = stdout.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+)/);
      if (match) {
        return { id: match[1], name: match[2].trim() };
      }
      return { id: '', name: line };
    });
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<MasApp[]> {
    const { stdout } = await exec('mas', ['outdated'], { silent: true });
    const lines = stdout.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s+\(/);
      if (match) {
        return { id: match[1], name: match[2] };
      }
      const parts = line.trim().split(/\s+/);
      return { id: parts[0], name: parts.slice(1).join(' ') };
    });
  }

  /**
   * Upgrade all apps
   */
  async upgradeAll(
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('mas', ['upgrade'], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }
}

/**
 * Create a default mas service instance
 */
export function createMasService(): MasService {
  return new MasService();
}
