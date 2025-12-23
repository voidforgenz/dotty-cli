import fs from 'fs/promises';
import TOML from '@iarna/toml';
import type { Dottyfile, App } from './schema.js';
import { getDottyfilePath, getDottyDir } from './parser.js';

/**
 * Convert a Dottyfile object to a TOML string
 */
export function stringifyDottyfile(config: Dottyfile): string {
  // @iarna/toml's stringify expects a plain object
  // We need to handle the conversion carefully to maintain proper TOML format
  return TOML.stringify(config as TOML.JsonMap);
}

/**
 * Write a Dottyfile to disk
 */
export async function writeDottyfile(
  config: Dottyfile,
  filePath?: string
): Promise<void> {
  const targetPath = filePath || getDottyfilePath();
  const content = stringifyDottyfile(config);
  await fs.writeFile(targetPath, content, 'utf-8');
}

/**
 * Ensure the .dotty directory exists
 */
export async function ensureDottyDir(): Promise<void> {
  await fs.mkdir(getDottyDir(), { recursive: true });
}

/**
 * Create a new Dottyfile with default values
 */
export function createDefaultDottyfile(): Dottyfile {
  return {
    version: 1,
    providers: ['homebrew', 'mas'],
    defaults: {
      mode: 'apply',
      confirm: true,
      destructive: 'prompt',
    },
    profiles: {
      active: ['base'],
    },
    apps: [],
  };
}

/**
 * Add an app to a Dottyfile (used by pull command)
 */
export function addApp(config: Dottyfile, app: App): Dottyfile {
  // Check if app already exists
  const existingIndex = config.apps.findIndex(a => a.id === app.id);

  if (existingIndex >= 0) {
    // Update existing app
    const updatedApps = [...config.apps];
    updatedApps[existingIndex] = app;
    return { ...config, apps: updatedApps };
  }

  // Add new app
  return { ...config, apps: [...config.apps, app] };
}

/**
 * Remove an app from a Dottyfile
 */
export function removeApp(config: Dottyfile, appId: string): Dottyfile {
  return {
    ...config,
    apps: config.apps.filter(a => a.id !== appId),
  };
}

/**
 * Get apps filtered by active profiles
 */
export function getActiveApps(config: Dottyfile): App[] {
  const activeProfiles = config.profiles?.active || ['base'];

  return config.apps.filter(app => {
    // If app has no profiles, it's always active
    if (!app.profiles || app.profiles.length === 0) {
      return true;
    }
    // Check if any of the app's profiles are active
    return app.profiles.some(profile => activeProfiles.includes(profile));
  });
}
