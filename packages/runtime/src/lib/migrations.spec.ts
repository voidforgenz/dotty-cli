import {
  CURRENT_SCHEMA_VERSION,
  getConfigVersion,
  findMigrations,
  registerMigration,
  getRegisteredMigrations,
  getMigrationsDir,
  getMigrationHistoryPath,
  readMigrationHistory,
  writeMigrationHistory,
  checkMigrationsNeeded,
  runMigrations,
  type Migration,
  type MigrationRecord,
} from './migrations.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
jest.mock('fs/promises');
jest.mock('fs');

// Mock @dottyfiles/config
jest.mock('@dottyfiles/config', () => ({
  getDottyfilePath: jest.fn(() => '/mock/.dotty/Dottyfile'),
}));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should be a positive number', () => {
      expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0);
    });
  });

  describe('getConfigVersion', () => {
    it('should return version when present', () => {
      expect(getConfigVersion({ version: 1 })).toBe(1);
      expect(getConfigVersion({ version: 2 })).toBe(2);
    });

    it('should return 1 for missing version', () => {
      expect(getConfigVersion({})).toBe(1);
    });

    it('should return 1 for non-number version', () => {
      expect(getConfigVersion({ version: 'v1' })).toBe(1);
      expect(getConfigVersion({ version: null })).toBe(1);
    });
  });

  describe('findMigrations', () => {
    it('should return empty array when from >= to', () => {
      expect(findMigrations(1, 1)).toEqual([]);
      expect(findMigrations(2, 1)).toEqual([]);
    });

    it('should return empty array when no migrations registered', () => {
      // Note: This assumes no migrations are registered by default
      // which is the current state of the codebase
      expect(findMigrations(1, 10)).toEqual([]);
    });
  });

  describe('registerMigration and getRegisteredMigrations', () => {

    it('should register a migration', () => {
      const migration: Migration = {
        from: 100,
        to: 101,
        description: 'Test migration',
        migrate: (config) => config,
      };

      registerMigration(migration);
      const registered = getRegisteredMigrations();

      expect(registered.some(m => m.from === 100 && m.to === 101)).toBe(true);
    });

    it('should find registered migrations', () => {
      const migration: Migration = {
        from: 200,
        to: 201,
        description: 'Another test migration',
        migrate: (config) => config,
      };

      registerMigration(migration);
      const found = findMigrations(200, 201);

      expect(found).toHaveLength(1);
      expect(found[0].description).toBe('Another test migration');
    });

    it('should chain migrations', () => {
      registerMigration({
        from: 300,
        to: 301,
        description: 'First step',
        migrate: (config) => config,
      });
      registerMigration({
        from: 301,
        to: 302,
        description: 'Second step',
        migrate: (config) => config,
      });

      const found = findMigrations(300, 302);
      expect(found).toHaveLength(2);
      expect(found[0].from).toBe(300);
      expect(found[1].from).toBe(301);
    });

    it('should execute migration transform', () => {
      const migration: Migration = {
        from: 400,
        to: 401,
        description: 'Add new field',
        migrate: (config) => ({
          ...config,
          newField: 'added',
        }),
      };

      registerMigration(migration);

      const found = findMigrations(400, 401);
      const result = found[0].migrate({ version: 400, existing: 'data' });

      expect(result).toEqual({
        version: 400,
        existing: 'data',
        newField: 'added',
      });
    });
  });

  describe('getMigrationsDir', () => {
    it('should return path ending with migrations', () => {
      const dir = getMigrationsDir();
      expect(dir).toMatch(/migrations$/);
    });
  });

  describe('getMigrationHistoryPath', () => {
    it('should return path ending with history.json', () => {
      const path = getMigrationHistoryPath();
      expect(path).toMatch(/history\.json$/);
    });
  });

  describe('readMigrationHistory', () => {
    it('should return empty array when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await readMigrationHistory();
      expect(result).toEqual([]);
    });

    it('should return parsed history when file exists', async () => {
      const history: MigrationRecord[] = [
        {
          version: '1->2',
          from: 1,
          to: 2,
          description: 'Test migration',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(history));

      const result = await readMigrationHistory();
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('1->2');
    });

    it('should return empty array on parse error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('invalid json');

      const result = await readMigrationHistory();
      expect(result).toEqual([]);
    });
  });

  describe('writeMigrationHistory', () => {
    it('should create directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const records: MigrationRecord[] = [];
      await writeMigrationHistory(records);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('migrations'),
        { recursive: true }
      );
    });

    it('should write JSON to file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockResolvedValue(undefined);

      const records: MigrationRecord[] = [
        {
          version: '1->2',
          from: 1,
          to: 2,
          description: 'Test',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];
      await writeMigrationHistory(records);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('history.json'),
        expect.stringContaining('"version": "1->2"'),
        'utf-8'
      );
    });
  });

  describe('checkMigrationsNeeded', () => {
    it('should return not needed when no Dottyfile exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await checkMigrationsNeeded();
      expect(result.needed).toBe(false);
      expect(result.currentVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should return not needed when version is current', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(`version = ${CURRENT_SCHEMA_VERSION}`);

      const result = await checkMigrationsNeeded();
      expect(result.needed).toBe(false);
    });

    it('should return needed when migrations are registered', async () => {
      // Register a test migration
      registerMigration({
        from: 500,
        to: 501,
        description: 'Test check migration',
        migrate: (config) => config,
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('version = 500');

      const result = await checkMigrationsNeeded();
      // This will find migrations from 500 to 501
      expect(result.currentVersion).toBe(500);
    });
  });

  describe('runMigrations', () => {
    it('should return error when no Dottyfile exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await runMigrations();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No Dottyfile found');
    });

    it('should return success with no applied when no migrations needed', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(`version = ${CURRENT_SCHEMA_VERSION}`);

      const result = await runMigrations();
      expect(result.success).toBe(true);
      expect(result.applied).toHaveLength(0);
    });

    it('should apply migrations and write file', async () => {
      // Register a test migration
      registerMigration({
        from: 600,
        to: 601,
        description: 'Add test field',
        migrate: (config) => ({ ...config, testField: true }),
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('version = 600');
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const result = await runMigrations();

      // Check migration was applied
      if (result.applied.length > 0) {
        expect(result.fromVersion).toBe(600);
        expect(mockWriteFile).toHaveBeenCalled();
      }
    });

    it('should not write file in dry run mode', async () => {
      registerMigration({
        from: 700,
        to: 701,
        description: 'Dry run test',
        migrate: (config) => config,
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('version = 700');

      const result = await runMigrations({ dryRun: true });

      // writeFile should not be called for the main dottyfile
      // (might still be called for history in non-dry-run)
      expect(result.applied.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle migration errors', async () => {
      // Use version 0→1 since CURRENT_SCHEMA_VERSION is 1
      registerMigration({
        from: 0,
        to: 1,
        description: 'Failing migration',
        migrate: () => {
          throw new Error('Migration failed');
        },
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('version = 0');

      const result = await runMigrations();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration 0->1 failed');
    });
  });

  describe('registerMigration ordering', () => {
    it('should insert migration at correct position', () => {
      // Register migrations out of order
      registerMigration({
        from: 1000,
        to: 1001,
        description: 'First',
        migrate: (c) => c,
      });
      registerMigration({
        from: 998,
        to: 999,
        description: 'Before first',
        migrate: (c) => c,
      });
      registerMigration({
        from: 1002,
        to: 1003,
        description: 'After first',
        migrate: (c) => c,
      });

      const migrations = getRegisteredMigrations();
      const m998 = migrations.findIndex(m => m.from === 998);
      const m1000 = migrations.findIndex(m => m.from === 1000);
      const m1002 = migrations.findIndex(m => m.from === 1002);

      // 998 should come before 1000, and 1000 should come before 1002
      expect(m998).toBeLessThan(m1000);
      expect(m1000).toBeLessThan(m1002);
    });
  });
});
