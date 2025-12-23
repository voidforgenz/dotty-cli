import { MasService, createMasService } from './service.js';

// Mock @dotty/core
jest.mock('@dotty/core', () => ({
  exec: jest.fn(),
  commandExists: jest.fn(),
}));

import { exec, commandExists } from '@dotty/core';

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockCommandExists = commandExists as jest.MockedFunction<typeof commandExists>;

describe('MasService', () => {
  let service: MasService;

  beforeEach(() => {
    service = new MasService();
    jest.clearAllMocks();
  });

  describe('createMasService', () => {
    it('should create a MasService instance', () => {
      const svc = createMasService();
      expect(svc).toBeInstanceOf(MasService);
    });
  });

  describe('isInstalled', () => {
    it('should return true when mas is available', async () => {
      mockCommandExists.mockResolvedValue(true);
      expect(await service.isInstalled()).toBe(true);
    });

    it('should return false when mas is not available', async () => {
      mockCommandExists.mockResolvedValue(false);
      expect(await service.isInstalled()).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return version string', async () => {
      mockExec.mockResolvedValue({ stdout: '1.8.6\n', stderr: '', exitCode: 0 });
      const version = await service.getVersion();
      expect(version).toBe('1.8.6');
    });

    it('should return null on error', async () => {
      mockExec.mockRejectedValue(new Error('Command not found'));
      const version = await service.getVersion();
      expect(version).toBeNull();
    });
  });

  describe('getInstalledApps - parsing mas list output', () => {
    it('should parse standard format without leading spaces', async () => {
      const output = `1091675654  Shapr3D    (5.1012.0)
497799835   Xcode      (26.2)
310633997   WhatsApp   (25.37.76)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(3);
      expect(apps[0]).toEqual({ id: '1091675654', name: 'Shapr3D' });
      expect(apps[1]).toEqual({ id: '497799835', name: 'Xcode' });
      expect(apps[2]).toEqual({ id: '310633997', name: 'WhatsApp' });
    });

    it('should parse format with leading spaces (bug fix regression test)', async () => {
      // This is the actual format seen on some systems where some entries have leading spaces
      const output = `1091675654  Shapr3D    (5.1012.0)
 310633997  WhatsApp   (25.37.76)
  497799835 Xcode      (26.2)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(3);
      expect(apps[0]).toEqual({ id: '1091675654', name: 'Shapr3D' });
      expect(apps[1]).toEqual({ id: '310633997', name: 'WhatsApp' });
      expect(apps[2]).toEqual({ id: '497799835', name: 'Xcode' });
    });

    it('should handle apps with multi-word names', async () => {
      const output = `824171161   Affinity Designer 2    (2.6.0)
824183456   Affinity Photo 2       (2.6.0)
1289583905  Pixelmator Pro         (3.6.13)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(3);
      expect(apps[0]).toEqual({ id: '824171161', name: 'Affinity Designer 2' });
      expect(apps[1]).toEqual({ id: '824183456', name: 'Affinity Photo 2' });
      expect(apps[2]).toEqual({ id: '1289583905', name: 'Pixelmator Pro' });
    });

    it('should handle empty output', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(0);
    });

    it('should handle fallback parsing for unusual formats', async () => {
      // No parentheses - falls back to simple split
      const output = `123456789 SomeApp`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(1);
      expect(apps[0].id).toBe('123456789');
    });

    it('should handle mixed formats in single output', async () => {
      const output = `1091675654  Shapr3D    (5.1012.0)
 310633997  WhatsApp   (25.37.76)
123456789 SimpleApp`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await service.getInstalledApps();
      expect(apps).toHaveLength(3);
      expect(apps[0].id).toBe('1091675654');
      expect(apps[1].id).toBe('310633997');
      expect(apps[2].id).toBe('123456789');
    });
  });

  describe('isAppInstalled', () => {
    it('should return true when app ID is in list', async () => {
      mockExec.mockResolvedValue({
        stdout: '497799835   Xcode      (26.2)\n310633997  WhatsApp   (25.37.76)',
        stderr: '',
        exitCode: 0,
      });

      expect(await service.isAppInstalled('497799835')).toBe(true);
    });

    it('should return false when app ID is not in list', async () => {
      mockExec.mockResolvedValue({
        stdout: '497799835   Xcode      (26.2)',
        stderr: '',
        exitCode: 0,
      });

      expect(await service.isAppInstalled('999999999')).toBe(false);
    });
  });

  describe('install', () => {
    it('should return success on successful install', async () => {
      mockExec.mockResolvedValue({ stdout: 'Installed', stderr: '', exitCode: 0 });

      const result = await service.install('497799835');
      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('mas', ['install', '497799835'], expect.any(Object));
    });

    it('should return failure with error message', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Not signed in',
        exitCode: 1,
      });

      const result = await service.install('497799835');
      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Error: Not signed in');
    });

    it('should pass spinner option', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      await service.install('497799835', { spinner: 'Installing...' });
      expect(mockExec).toHaveBeenCalledWith(
        'mas',
        ['install', '497799835'],
        { spinner: 'Installing...' }
      );
    });
  });

  describe('search - parsing mas search output', () => {
    it('should parse search results', async () => {
      const output = `   497799835  Xcode (26.2)
   824171161  Affinity Designer 2 (2.6.0)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const results = await service.search('design');
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: '497799835', name: 'Xcode (26.2)' });
      expect(results[1]).toEqual({ id: '824171161', name: 'Affinity Designer 2 (2.6.0)' });
    });

    it('should handle empty search results', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const results = await service.search('nonexistentapp');
      expect(results).toHaveLength(0);
    });

    it('should handle search results with leading spaces', async () => {
      const output = `  497799835  Xcode (26.2)
   824171161  Affinity Designer`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const results = await service.search('code');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('497799835');
      expect(results[1].id).toBe('824171161');
    });
  });

  describe('checkForUpdates - parsing mas outdated output', () => {
    it('should parse outdated apps', async () => {
      const output = `497799835  Xcode      (26.1 -> 26.2)
824171161  Affinity Designer 2    (2.5.0 -> 2.6.0)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const updates = await service.checkForUpdates();
      expect(updates).toHaveLength(2);
      expect(updates[0]).toEqual({ id: '497799835', name: 'Xcode' });
      expect(updates[1]).toEqual({ id: '824171161', name: 'Affinity Designer 2' });
    });

    it('should handle no updates available', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const updates = await service.checkForUpdates();
      expect(updates).toHaveLength(0);
    });

    it('should handle leading spaces in outdated output', async () => {
      const output = ` 497799835  Xcode      (26.1 -> 26.2)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const updates = await service.checkForUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].id).toBe('497799835');
    });
  });

  describe('upgradeAll', () => {
    it('should return success on successful upgrade', async () => {
      mockExec.mockResolvedValue({ stdout: 'Upgraded', stderr: '', exitCode: 0 });

      const result = await service.upgradeAll();
      expect(result.success).toBe(true);
    });

    it('should return failure on error', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Not signed in',
        exitCode: 1,
      });

      const result = await service.upgradeAll();
      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Error: Not signed in');
    });
  });
});
