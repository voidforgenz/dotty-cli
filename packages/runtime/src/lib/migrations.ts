import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml';
import { getDottyfilePath } from '@dotty/config';

/**
 * Current schema version - increment this when making breaking changes
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * A migration transforms a Dottyfile from one version to another
 */
export interface Migration {
  /** Source version */
  from: number;
  /** Target version */
  to: number;
  /** Description of what this migration does */
  description: string;
  /** Transform the config object */
  migrate: (config: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Record of an applied migration
 */
export interface MigrationRecord {
  version: string;
  from: number;
  to: number;
  description: string;
  timestamp: string;
}

/**
 * Result of running migrations
 */
export interface MigrateResult {
  success: boolean;
  applied: MigrationRecord[];
  error?: string;
  fromVersion: number;
  toVersion: number;
}

/**
 * Registry of all migrations
 * Add new migrations here when schema changes
 */
const migrations: Migration[] = [
  // Example migration for future use:
  // {
  //   from: 1,
  //   to: 2,
  //   description: 'Add profiles.default field',
  //   migrate: (config) => {
  //     if (config.profiles && !config.profiles.default) {
  //       config.profiles.default = 'base';
  //     }
  //     return config;
  //   },
  // },
];

/**
 * Get the migrations directory path
 */
export function getMigrationsDir(): string {
  const dottyfilePath = getDottyfilePath();
  return join(dirname(dottyfilePath), 'migrations');
}

/**
 * Get the migration history file path
 */
export function getMigrationHistoryPath(): string {
  return join(getMigrationsDir(), 'history.json');
}

/**
 * Read migration history
 */
export async function readMigrationHistory(): Promise<MigrationRecord[]> {
  const historyPath = getMigrationHistoryPath();

  if (!existsSync(historyPath)) {
    return [];
  }

  try {
    const content = await readFile(historyPath, 'utf-8');
    return JSON.parse(content) as MigrationRecord[];
  } catch {
    return [];
  }
}

/**
 * Write migration history
 */
export async function writeMigrationHistory(records: MigrationRecord[]): Promise<void> {
  const historyPath = getMigrationHistoryPath();
  const dir = dirname(historyPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(historyPath, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Get the version from a Dottyfile
 */
export function getConfigVersion(config: Record<string, unknown>): number {
  const version = config.version;
  if (typeof version === 'number') {
    return version;
  }
  // Default to version 1 if not specified
  return 1;
}

/**
 * Find migrations needed to go from one version to another
 */
export function findMigrations(from: number, to: number): Migration[] {
  if (from >= to) {
    return [];
  }

  const needed: Migration[] = [];
  let current = from;

  while (current < to) {
    const next = migrations.find(m => m.from === current);
    if (!next) {
      // No migration path found
      break;
    }
    needed.push(next);
    current = next.to;
  }

  return needed;
}

/**
 * Check if migrations are needed
 */
export async function checkMigrationsNeeded(): Promise<{
  needed: boolean;
  currentVersion: number;
  targetVersion: number;
  migrations: Migration[];
}> {
  const dottyfilePath = getDottyfilePath();

  if (!existsSync(dottyfilePath)) {
    return {
      needed: false,
      currentVersion: CURRENT_SCHEMA_VERSION,
      targetVersion: CURRENT_SCHEMA_VERSION,
      migrations: [],
    };
  }

  const content = await readFile(dottyfilePath, 'utf-8');
  const config = parseToml(content) as Record<string, unknown>;
  const currentVersion = getConfigVersion(config);
  const pendingMigrations = findMigrations(currentVersion, CURRENT_SCHEMA_VERSION);

  return {
    needed: pendingMigrations.length > 0,
    currentVersion,
    targetVersion: CURRENT_SCHEMA_VERSION,
    migrations: pendingMigrations,
  };
}

/**
 * Run migrations on the Dottyfile
 */
export async function runMigrations(options?: {
  dryRun?: boolean;
}): Promise<MigrateResult> {
  const dottyfilePath = getDottyfilePath();

  if (!existsSync(dottyfilePath)) {
    return {
      success: false,
      applied: [],
      error: 'No Dottyfile found',
      fromVersion: 0,
      toVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  // Read current config
  const content = await readFile(dottyfilePath, 'utf-8');
  let config = parseToml(content) as Record<string, unknown>;
  const fromVersion = getConfigVersion(config);

  // Find needed migrations
  const pendingMigrations = findMigrations(fromVersion, CURRENT_SCHEMA_VERSION);

  if (pendingMigrations.length === 0) {
    return {
      success: true,
      applied: [],
      fromVersion,
      toVersion: fromVersion,
    };
  }

  // Apply migrations
  const applied: MigrationRecord[] = [];

  for (const migration of pendingMigrations) {
    try {
      config = migration.migrate(config);
      config.version = migration.to;

      applied.push({
        version: `${migration.from}->${migration.to}`,
        from: migration.from,
        to: migration.to,
        description: migration.description,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return {
        success: false,
        applied,
        error: `Migration ${migration.from}->${migration.to} failed: ${error}`,
        fromVersion,
        toVersion: migration.from,
      };
    }
  }

  if (!options?.dryRun) {
    // Write updated config
    const newContent = stringifyToml(config as Parameters<typeof stringifyToml>[0]);
    await writeFile(dottyfilePath, newContent, 'utf-8');

    // Record migration history
    const history = await readMigrationHistory();
    history.push(...applied);
    await writeMigrationHistory(history);
  }

  return {
    success: true,
    applied,
    fromVersion,
    toVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Register a custom migration (for testing or plugins)
 */
export function registerMigration(migration: Migration): void {
  // Insert in order
  const index = migrations.findIndex(m => m.from >= migration.from);
  if (index === -1) {
    migrations.push(migration);
  } else {
    migrations.splice(index, 0, migration);
  }
}

/**
 * Get all registered migrations
 */
export function getRegisteredMigrations(): Migration[] {
  return [...migrations];
}
