// Types
export * from './lib/types.js';

// Provider loading
export {
  PROVIDER_PACKAGES,
  getDottyNodeModules,
  getProviderPackage,
  isProviderInstalled,
  loadProvider,
  loadProviders,
  getAvailableProviders,
  clearProviderCache,
  registerProviderFactory,
} from './lib/loader.js';

// Package installation
export {
  getDottyPackageJsonPath,
  readDottyPackageJson,
  writeDottyPackageJson,
  ensureDottyPackageJson,
  addProviderDependency,
  getInstalledProviderVersion,
  checkProviderVersions,
  getInstallCommand,
  ensureDottyGitignore,
} from './lib/installer.js';

// App resolution
export {
  resolveAppProvider,
  resolveAllApps,
  groupByProvider,
  findMissingApps,
  findExtraApps,
  installMissingApps,
  type ResolvedApp,
} from './lib/resolver.js';
