import path from 'path';
import { getDottyDir } from '@dottyfiles/config';
import type { Provider, ProviderModule } from './types.js';

/**
 * Map of provider names to their package names
 */
export const PROVIDER_PACKAGES: Record<string, string> = {
  homebrew: '@dottyfiles/homebrew',
  mas: '@dottyfiles/mas',
};

/**
 * Cache of loaded providers
 */
const providerCache = new Map<string, Provider>();

/**
 * Pre-registered provider factories (for bundled providers)
 */
const providerFactories = new Map<string, () => Provider>();

/**
 * Register a provider factory (for bundled providers)
 */
export function registerProviderFactory(name: string, factory: () => Provider): void {
  providerFactories.set(name, factory);
}

/**
 * Get the path to node_modules in ~/.dotty
 */
export function getDottyNodeModules(): string {
  return path.join(getDottyDir(), 'node_modules');
}

/**
 * Get the package name for a provider
 */
export function getProviderPackage(providerName: string): string | undefined {
  return PROVIDER_PACKAGES[providerName];
}

/**
 * Check if a provider package is installed in ~/.dotty
 */
export async function isProviderInstalled(providerName: string): Promise<boolean> {
  const packageName = getProviderPackage(providerName);
  if (!packageName) return false;

  try {
    const modulePath = path.join(getDottyNodeModules(), packageName);
    await import(modulePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a provider by name
 */
export async function loadProvider(providerName: string): Promise<Provider | null> {
  // Check cache first
  const cached = providerCache.get(providerName);
  if (cached) {
    return cached;
  }

  const packageName = getProviderPackage(providerName);
  if (!packageName) {
    return null;
  }

  // Try registered factory first (for bundled providers)
  const factory = providerFactories.get(providerName);
  if (factory) {
    const provider = factory();
    providerCache.set(providerName, provider);
    return provider;
  }

  try {
    // Try loading from ~/.dotty/node_modules first
    const dottyPath = path.join(getDottyNodeModules(), packageName);
    const module = await import(dottyPath) as ProviderModule;

    if (typeof module.createProvider !== 'function') {
      throw new Error(`Provider ${providerName} does not export createProvider()`);
    }

    const provider = module.createProvider();
    providerCache.set(providerName, provider);
    return provider;
  } catch {
    // Fallback: try loading from global/bundled modules
    try {
      const module = await import(packageName) as ProviderModule;

      if (typeof module.createProvider !== 'function') {
        throw new Error(`Provider ${providerName} does not export createProvider()`);
      }

      const provider = module.createProvider();
      providerCache.set(providerName, provider);
      return provider;
    } catch {
      return null;
    }
  }
}

/**
 * Load multiple providers
 */
export async function loadProviders(providerNames: string[]): Promise<Map<string, Provider>> {
  const providers = new Map<string, Provider>();

  for (const name of providerNames) {
    const provider = await loadProvider(name);
    if (provider) {
      providers.set(name, provider);
    }
  }

  return providers;
}

/**
 * Get list of available providers (installed and working)
 */
export async function getAvailableProviders(providerNames: string[]): Promise<string[]> {
  const available: string[] = [];

  for (const name of providerNames) {
    const provider = await loadProvider(name);
    if (provider && await provider.isAvailable()) {
      available.push(name);
    }
  }

  return available;
}

/**
 * Clear the provider cache (useful for testing)
 */
export function clearProviderCache(): void {
  providerCache.clear();
}
