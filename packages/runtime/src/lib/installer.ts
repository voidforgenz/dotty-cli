import fs from 'fs/promises';
import path from 'path';
import { getDottyDir, ensureDottyDir } from '@dotty/config';
import { PROVIDER_PACKAGES } from './loader.js';

/**
 * Get the path to package.json in ~/.dotty
 */
export function getDottyPackageJsonPath(): string {
  return path.join(getDottyDir(), 'package.json');
}

/**
 * Read the package.json from ~/.dotty
 */
export async function readDottyPackageJson(): Promise<Record<string, unknown> | null> {
  try {
    const content = await fs.readFile(getDottyPackageJsonPath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write package.json to ~/.dotty
 */
export async function writeDottyPackageJson(pkg: Record<string, unknown>): Promise<void> {
  await ensureDottyDir();
  await fs.writeFile(
    getDottyPackageJsonPath(),
    JSON.stringify(pkg, null, 2),
    'utf-8'
  );
}

/**
 * Create or update the package.json in ~/.dotty
 */
export async function ensureDottyPackageJson(cliVersion: string): Promise<void> {
  const existing = await readDottyPackageJson();

  if (existing) {
    return; // Already exists, don't overwrite
  }

  const pkg = {
    name: 'dotty-user-config',
    version: '1.0.0',
    private: true,
    type: 'module',
    description: 'Dotty user configuration and providers',
    dependencies: {} as Record<string, string>,
  };

  await writeDottyPackageJson(pkg);
}

/**
 * Add a provider dependency to ~/.dotty/package.json
 */
export async function addProviderDependency(
  providerName: string,
  version: string
): Promise<void> {
  const packageName = PROVIDER_PACKAGES[providerName];
  if (!packageName) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const pkg = await readDottyPackageJson() || {
    name: 'dotty-user-config',
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies: {},
  };

  const deps = (pkg.dependencies || {}) as Record<string, string>;
  deps[packageName] = version;
  pkg.dependencies = deps;

  await writeDottyPackageJson(pkg);
}

/**
 * Get the installed version of a provider
 */
export async function getInstalledProviderVersion(
  providerName: string
): Promise<string | null> {
  const packageName = PROVIDER_PACKAGES[providerName];
  if (!packageName) return null;

  try {
    const pkgPath = path.join(getDottyDir(), 'node_modules', packageName, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || null;
  } catch {
    return null;
  }
}

/**
 * Check if all providers are installed with correct versions
 */
export async function checkProviderVersions(
  providerNames: string[],
  expectedVersion: string
): Promise<{ name: string; installed: string | null; expected: string }[]> {
  const results: { name: string; installed: string | null; expected: string }[] = [];

  for (const name of providerNames) {
    const installed = await getInstalledProviderVersion(name);
    results.push({
      name,
      installed,
      expected: expectedVersion,
    });
  }

  return results;
}

/**
 * Generate npm install command for providers
 */
export function getInstallCommand(providerNames: string[], version: string): string {
  const packages = providerNames
    .map(name => PROVIDER_PACKAGES[name])
    .filter(Boolean)
    .map(pkg => `${pkg}@${version}`);

  return `npm install ${packages.join(' ')}`;
}

/**
 * Create .gitignore in ~/.dotty
 */
export async function ensureDottyGitignore(): Promise<void> {
  const gitignorePath = path.join(getDottyDir(), '.gitignore');

  try {
    await fs.access(gitignorePath);
    return; // Already exists
  } catch {
    // Create it
    const content = `# Dependencies
node_modules/

# Build artifacts
*.log
`;
    await fs.writeFile(gitignorePath, content, 'utf-8');
  }
}
