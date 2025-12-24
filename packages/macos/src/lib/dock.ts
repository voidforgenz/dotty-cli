import { exec, commandExists } from '@dottyfiles/core';
import type { DockSettings } from '@dottyfiles/config';
import type { ApplyResult, MacosApplyOptions } from './types.js';

/**
 * Map of app names/ids to their .app paths
 * Fallback when app isn't found in standard locations
 */
const APP_PATH_MAP: Record<string, string> = {
  finder: '/System/Library/CoreServices/Finder.app',
  messages: '/System/Applications/Messages.app',
  mail: '/System/Applications/Mail.app',
  safari: '/Applications/Safari.app',
  'system preferences': '/System/Applications/System Preferences.app',
  'system settings': '/System/Applications/System Settings.app',
};

/**
 * Resolve an app name to its full path
 */
async function resolveAppPath(appName: string): Promise<string | null> {
  // Check common locations
  const locations = [
    `/Applications/${appName}.app`,
    `/System/Applications/${appName}.app`,
    `/System/Library/CoreServices/${appName}.app`,
    `~/Applications/${appName}.app`,
  ];

  for (const location of locations) {
    const expanded = location.replace('~', process.env.HOME || '');
    const { exitCode } = await exec('test', ['-d', expanded], { silent: true });
    if (exitCode === 0) {
      return expanded;
    }
  }

  // Check map for known apps
  const lower = appName.toLowerCase();
  if (APP_PATH_MAP[lower]) {
    return APP_PATH_MAP[lower];
  }

  // Try mdfind as last resort
  const { stdout, exitCode } = await exec(
    'mdfind',
    [`kMDItemKind=="Application" && kMDItemDisplayName=="${appName}"cd`],
    { silent: true }
  );

  if (exitCode === 0 && stdout.trim()) {
    return stdout.trim().split('\n')[0];
  }

  return null;
}

/**
 * Check if dockutil is available
 */
export async function isDockutilAvailable(): Promise<boolean> {
  return commandExists('dockutil');
}

/**
 * Apply dock settings
 */
export async function applyDockSettings(
  settings: DockSettings,
  options?: MacosApplyOptions
): Promise<ApplyResult> {
  const changes: string[] = [];

  try {
    // Apply dock preferences via defaults
    if (settings.autohide !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.dock',
          'autohide',
          '-bool',
          settings.autohide ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`autohide: ${settings.autohide}`);
    }

    if (settings.showRecents !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.dock',
          'show-recents',
          '-bool',
          settings.showRecents ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`show-recents: ${settings.showRecents}`);
    }

    if (settings.iconSize !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.dock',
          'tilesize',
          '-int',
          String(settings.iconSize),
        ], { silent: true });
      }
      changes.push(`tilesize: ${settings.iconSize}`);
    }

    // Apply dock apps via dockutil (if available and apps specified)
    if (settings.apps && settings.apps.length > 0) {
      const hasDockutil = await isDockutilAvailable();

      if (!hasDockutil) {
        return {
          success: false,
          changed: changes.length > 0,
          error: 'dockutil is required for managing dock apps. Install with: brew install dockutil',
        };
      }

      if (!options?.dryRun) {
        // Remove all existing apps
        await exec('dockutil', ['--remove', 'all', '--no-restart'], { silent: true });

        // Add apps in order
        for (const appName of settings.apps) {
          const appPath = await resolveAppPath(appName);
          if (appPath) {
            await exec('dockutil', ['--add', appPath, '--no-restart'], { silent: true });
          }
        }
      }
      changes.push(`apps: ${settings.apps.join(', ')}`);
    }

    // Apply dock folders via dockutil
    if (settings.folders && settings.folders.length > 0) {
      const hasDockutil = await isDockutilAvailable();

      if (hasDockutil) {
        const view = settings.foldersView || 'grid';
        const display = settings.foldersDisplay || 'folder';

        if (!options?.dryRun) {
          for (const folder of settings.folders) {
            const expanded = folder.replace('~', process.env.HOME || '');
            await exec('dockutil', [
              '--add',
              expanded,
              '--view',
              view,
              '--display',
              display,
              '--no-restart',
            ], { silent: true });
          }
        }
        changes.push(`folders: ${settings.folders.join(', ')}`);
      }
    }

    // Restart dock to apply changes
    if (changes.length > 0 && !options?.dryRun) {
      await exec('killall', ['Dock'], { silent: true });
    }

    return {
      success: true,
      changed: changes.length > 0,
    };
  } catch (error) {
    return {
      success: false,
      changed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
