import fs from 'fs/promises';
import TOML from '@iarna/toml';
import type { Dottyfile, App } from './schema.js';
import { getDottyfilePath, getDottyDir } from './parser.js';
import { getEffectiveProfiles } from './profiles.js';

/**
 * Convert a Dottyfile object to a TOML string
 */
export function stringifyDottyfile(config: Dottyfile): string {
  // @iarna/toml's stringify expects a plain object
  // We need to handle the conversion carefully to maintain proper TOML format
  return TOML.stringify(config as TOML.JsonMap);
}

/**
 * Write a Dottyfile to disk (automatically dedupes apps)
 */
export async function writeDottyfile(
  config: Dottyfile,
  filePath?: string
): Promise<void> {
  const targetPath = filePath || getDottyfilePath();
  // Dedupe apps before writing
  const dedupedConfig = {
    ...config,
    apps: dedupeApps(config.apps),
  };
  const content = stringifyDottyfile(dedupedConfig);
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
 * Check if two apps are duplicates based on various identifiers
 */
function areAppsDuplicates(a: App, b: App): boolean {
  // Same ID (non-empty)
  if (a.id && b.id && a.id === b.id) return true;

  // Same MAS ID
  if (a.mas?.id && b.mas?.id && a.mas.id === b.mas.id) return true;

  // Same Homebrew formula
  if (a.homebrew?.formula && b.homebrew?.formula && a.homebrew.formula === b.homebrew.formula) return true;

  // Same Homebrew cask
  if (a.homebrew?.cask && b.homebrew?.cask && a.homebrew.cask === b.homebrew.cask) return true;

  // Same name (only if both have no provider info - likely duplicates)
  if (a.name === b.name && !a.mas && !b.mas && !a.homebrew && !b.homebrew) return true;

  // Check if name contains the other's ID (broken entry detection)
  // e.g., name="497799835 Xcode (26.2)" matches id="497799835"
  if (a.mas?.id && b.name.includes(String(a.mas.id))) return true;
  if (b.mas?.id && a.name.includes(String(b.mas.id))) return true;

  return false;
}

/**
 * Score an app entry - higher score means more complete/preferred
 */
function scoreApp(app: App): number {
  let score = 0;
  if (app.id && app.id.length > 0) score += 10;
  if (app.name && !app.name.match(/^\d+\s/)) score += 5; // Name doesn't start with ID
  if (app.mas?.id) score += 20;
  if (app.homebrew?.formula || app.homebrew?.cask) score += 20;
  if (app.profiles && app.profiles.length > 0) score += 5;
  return score;
}

/**
 * Deduplicate apps array, keeping the most complete entry for each app
 */
export function dedupeApps(apps: App[]): App[] {
  const result: App[] = [];

  for (const app of apps) {
    // Find if this app duplicates any existing entry
    const existingIndex = result.findIndex(existing => areAppsDuplicates(existing, app));

    if (existingIndex >= 0) {
      // Keep the one with higher score
      const existing = result[existingIndex];
      if (scoreApp(app) > scoreApp(existing)) {
        result[existingIndex] = app;
      }
    } else {
      result.push(app);
    }
  }

  return result;
}

/**
 * Add an app to a Dottyfile (used by pull command)
 */
export function addApp(config: Dottyfile, app: App): Dottyfile {
  // Check if app already exists by ID
  const existingIndex = config.apps.findIndex(a => a.id === app.id);

  if (existingIndex >= 0) {
    // Update existing app
    const updatedApps = [...config.apps];
    updatedApps[existingIndex] = app;
    return { ...config, apps: updatedApps };
  }

  // Check for duplicates by other criteria
  const duplicateIndex = config.apps.findIndex(a => areAppsDuplicates(a, app));

  if (duplicateIndex >= 0) {
    // Replace if new app is more complete
    const existing = config.apps[duplicateIndex];
    if (scoreApp(app) > scoreApp(existing)) {
      const updatedApps = [...config.apps];
      updatedApps[duplicateIndex] = app;
      return { ...config, apps: updatedApps };
    }
    // Keep existing, don't add duplicate
    return config;
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
 * Get apps filtered by effective profiles (includes inheritance and hostname auto-activation)
 */
export function getActiveApps(config: Dottyfile): App[] {
  const effectiveProfiles = getEffectiveProfiles(config);

  return config.apps.filter(app => {
    // If app has no profiles, it's always active
    if (!app.profiles || app.profiles.length === 0) {
      return true;
    }
    // Check if any of the app's profiles are effective
    return app.profiles.some(profile => effectiveProfiles.includes(profile));
  });
}
