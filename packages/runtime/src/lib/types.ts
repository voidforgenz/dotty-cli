import type { App } from '@dottyfiles/config';

/**
 * Result of a provider operation
 */
export interface ProviderResult {
  success: boolean;
  error?: string;
}

/**
 * An installed app as reported by a provider
 */
export interface InstalledApp {
  id: string;
  name: string;
  version?: string;
  /** Provider-specific metadata (e.g., { type: 'formula' | 'cask' } for homebrew) */
  meta?: Record<string, unknown>;
}

/**
 * Provider interface that all package manager providers must implement
 */
export interface Provider {
  /**
   * Unique name of the provider (e.g., 'homebrew', 'mas')
   */
  readonly name: string;

  /**
   * Check if the provider's CLI tool is installed
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the version of the provider's CLI tool
   */
  getVersion(): Promise<string | null>;

  /**
   * Get all apps installed via this provider
   */
  getInstalled(): Promise<InstalledApp[]>;

  /**
   * Check if a specific app is installed
   */
  isInstalled(app: App): Promise<boolean>;

  /**
   * Install an app
   */
  install(app: App, options?: InstallOptions): Promise<ProviderResult>;

  /**
   * Uninstall an app
   */
  uninstall(app: App, options?: UninstallOptions): Promise<ProviderResult>;
}

export interface InstallOptions {
  spinner?: string;
  dryRun?: boolean;
}

export interface UninstallOptions {
  spinner?: string;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Provider module export shape
 */
export interface ProviderModule {
  createProvider(): Provider;
}
