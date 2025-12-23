import os from 'os';
import type {
  Dottyfile,
  ProfileDefinition,
  DockSettings,
  KeyboardSettings,
  TrackpadSettings,
  MouseSettings,
} from './schema.js';

/**
 * System settings that can be overridden per profile
 */
export interface ProfileSettings {
  dock?: DockSettings;
  keyboard?: KeyboardSettings;
  trackpad?: TrackpadSettings;
  mouse?: MouseSettings;
}

/**
 * Get the current machine's hostname
 */
export function getHostname(): string {
  return os.hostname().toLowerCase().replace(/\.local$/, '');
}

/**
 * Get all profile names defined in the Dottyfile
 * This includes profiles referenced in apps and explicitly defined profiles
 */
export function getAllProfileNames(config: Dottyfile): string[] {
  const profiles = new Set<string>();

  // Add 'base' as it's always implicit
  profiles.add('base');

  // Add explicitly active profiles
  if (config.profiles?.active) {
    for (const name of config.profiles.active) {
      profiles.add(name);
    }
  }

  // Add profiles from profile definitions
  if (config.profiles) {
    for (const key of Object.keys(config.profiles)) {
      if (key !== 'active') {
        profiles.add(key);
      }
    }
  }

  // Add profiles referenced in apps
  for (const app of config.apps) {
    if (app.profiles) {
      for (const profile of app.profiles) {
        profiles.add(profile);
      }
    }
  }

  return Array.from(profiles).sort();
}

/**
 * Get a profile definition by name
 */
export function getProfileDefinition(
  config: Dottyfile,
  name: string
): ProfileDefinition | undefined {
  if (!config.profiles) return undefined;

  const profiles = config.profiles as Record<string, unknown>;
  const def = profiles[name];

  if (!def || typeof def !== 'object') return undefined;

  return def as ProfileDefinition;
}

/**
 * Check if a profile should be auto-activated based on hostname
 */
export function shouldAutoActivate(
  definition: ProfileDefinition | undefined,
  currentHostname?: string
): boolean {
  if (!definition?.hostname) return false;

  const hostname = currentHostname ?? getHostname();
  const hostnames = Array.isArray(definition.hostname)
    ? definition.hostname
    : [definition.hostname];

  return hostnames.some(h => h.toLowerCase() === hostname);
}

/**
 * Get profiles that should be auto-activated based on hostname
 */
export function getAutoActivatedProfiles(config: Dottyfile): string[] {
  const hostname = getHostname();
  const autoActivated: string[] = [];

  if (!config.profiles) return autoActivated;

  for (const name of Object.keys(config.profiles)) {
    if (name === 'active') continue;

    const def = getProfileDefinition(config, name);
    if (shouldAutoActivate(def, hostname)) {
      autoActivated.push(name);
    }
  }

  return autoActivated;
}

/**
 * Resolve profile inheritance chain
 * Returns profiles in order from base to derived
 */
export function resolveProfileChain(
  config: Dottyfile,
  profileName: string,
  visited = new Set<string>()
): string[] {
  // Prevent circular dependencies
  if (visited.has(profileName)) {
    return [];
  }
  visited.add(profileName);

  const def = getProfileDefinition(config, profileName);
  if (!def?.extends) {
    return [profileName];
  }

  // Recursively resolve parent chain
  const parentChain = resolveProfileChain(config, def.extends, visited);
  return [...parentChain, profileName];
}

/**
 * Get effective active profiles, considering:
 * - Explicitly active profiles
 * - Profile inheritance (extends)
 * - Hostname-based auto-activation
 */
export function getEffectiveProfiles(config: Dottyfile): string[] {
  const effective = new Set<string>();

  // Start with explicitly active profiles
  const active = config.profiles?.active || ['base'];
  for (const name of active) {
    // Resolve inheritance chain for each active profile
    const chain = resolveProfileChain(config, name);
    for (const p of chain) {
      effective.add(p);
    }
  }

  // Add auto-activated profiles based on hostname
  const autoActivated = getAutoActivatedProfiles(config);
  for (const name of autoActivated) {
    const chain = resolveProfileChain(config, name);
    for (const p of chain) {
      effective.add(p);
    }
  }

  return Array.from(effective);
}

/**
 * Deep merge two settings objects
 */
function mergeSettings<T extends Record<string, unknown>>(
  base: T | undefined,
  override: T | undefined
): T | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;

  const result = { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Get merged system settings from active profiles
 * Settings are merged in order: base config → profile chain
 */
export function getEffectiveSettings(config: Dottyfile): ProfileSettings {
  const effectiveProfiles = getEffectiveProfiles(config);

  // Start with base config settings
  let settings: ProfileSettings = {
    dock: config.dock,
    keyboard: config.keyboard,
    trackpad: config.trackpad,
    mouse: config.mouse,
  };

  // Apply profile-specific settings in order
  for (const profileName of effectiveProfiles) {
    const def = getProfileDefinition(config, profileName);
    if (!def) continue;

    settings = {
      dock: mergeSettings(settings.dock, def.dock),
      keyboard: mergeSettings(settings.keyboard, def.keyboard),
      trackpad: mergeSettings(settings.trackpad, def.trackpad),
      mouse: mergeSettings(settings.mouse, def.mouse),
    };
  }

  return settings;
}

/**
 * Set active profiles in a config
 */
export function setActiveProfiles(
  config: Dottyfile,
  profiles: string[]
): Dottyfile {
  return {
    ...config,
    profiles: {
      ...config.profiles,
      active: profiles,
    },
  };
}

/**
 * Add a profile to active profiles
 */
export function addActiveProfile(
  config: Dottyfile,
  profile: string
): Dottyfile {
  const current = config.profiles?.active || ['base'];
  if (current.includes(profile)) {
    return config;
  }
  return setActiveProfiles(config, [...current, profile]);
}

/**
 * Remove a profile from active profiles
 */
export function removeActiveProfile(
  config: Dottyfile,
  profile: string
): Dottyfile {
  const current = config.profiles?.active || ['base'];
  const filtered = current.filter(p => p !== profile);

  // Ensure at least one profile remains
  if (filtered.length === 0) {
    filtered.push('base');
  }

  return setActiveProfiles(config, filtered);
}
