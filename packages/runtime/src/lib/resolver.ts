import type { App, Dottyfile } from '@dottyfiles/config';
import type { Provider, ProviderResult, InstalledApp } from './types.js';

/**
 * Result of resolving which provider to use for an app
 */
export interface ResolvedApp {
  app: App;
  providerName: string;
  provider: Provider;
}

/**
 * Resolve which provider should handle an app
 *
 * Priority:
 * 1. If app.installer is set, use that provider
 * 2. Try providers in order from config.providers
 * 3. Use first provider that has installation info for this app
 */
export async function resolveAppProvider(
  app: App,
  providerOrder: string[],
  loadedProviders: Map<string, Provider>
): Promise<ResolvedApp | null> {
  // If app explicitly specifies an installer, use that
  if (app.installer) {
    const provider = loadedProviders.get(app.installer);
    if (provider) {
      return { app, providerName: app.installer, provider };
    }
    return null;
  }

  // Try providers in order
  for (const providerName of providerOrder) {
    const provider = loadedProviders.get(providerName);
    if (!provider) continue;

    // Check if this app has installation info for this provider
    if (providerName === 'homebrew' && app.homebrew) {
      return { app, providerName, provider };
    }
    if (providerName === 'mas' && app.mas) {
      return { app, providerName, provider };
    }
  }

  return null;
}

/**
 * Resolve all apps to their providers
 */
export async function resolveAllApps(
  apps: App[],
  providerOrder: string[],
  loadedProviders: Map<string, Provider>
): Promise<{
  resolved: ResolvedApp[];
  unresolved: App[];
}> {
  const resolved: ResolvedApp[] = [];
  const unresolved: App[] = [];

  for (const app of apps) {
    const result = await resolveAppProvider(app, providerOrder, loadedProviders);
    if (result) {
      resolved.push(result);
    } else {
      unresolved.push(app);
    }
  }

  return { resolved, unresolved };
}

/**
 * Group resolved apps by provider
 */
export function groupByProvider(
  resolved: ResolvedApp[]
): Map<string, ResolvedApp[]> {
  const groups = new Map<string, ResolvedApp[]>();

  for (const item of resolved) {
    const existing = groups.get(item.providerName) || [];
    existing.push(item);
    groups.set(item.providerName, existing);
  }

  return groups;
}

/**
 * Check which apps are not installed
 */
export async function findMissingApps(
  resolved: ResolvedApp[]
): Promise<ResolvedApp[]> {
  const missing: ResolvedApp[] = [];

  for (const item of resolved) {
    const isInstalled = await item.provider.isInstalled(item.app);
    if (!isInstalled) {
      missing.push(item);
    }
  }

  return missing;
}

/**
 * Find apps installed on the system but not in the Dottyfile
 */
export async function findExtraApps(
  config: Dottyfile,
  loadedProviders: Map<string, Provider>
): Promise<{ providerName: string; apps: InstalledApp[] }[]> {
  const results: { providerName: string; apps: InstalledApp[] }[] = [];
  const configAppIds = new Set(config.apps.map(a => a.id));

  for (const [providerName, provider] of loadedProviders) {
    const installed = await provider.getInstalled();
    const extra = installed.filter(app => !configAppIds.has(app.id));

    if (extra.length > 0) {
      results.push({ providerName, apps: extra });
    }
  }

  return results;
}

/**
 * Install all missing apps
 */
export async function installMissingApps(
  missing: ResolvedApp[],
  options?: { dryRun?: boolean; onProgress?: (app: App, result: ProviderResult) => void }
): Promise<{ success: App[]; failed: { app: App; error: string }[] }> {
  const success: App[] = [];
  const failed: { app: App; error: string }[] = [];

  for (const item of missing) {
    const result = await item.provider.install(item.app, {
      dryRun: options?.dryRun,
    });

    if (result.success) {
      success.push(item.app);
    } else {
      failed.push({ app: item.app, error: result.error || 'Unknown error' });
    }

    options?.onProgress?.(item.app, result);
  }

  return { success, failed };
}
