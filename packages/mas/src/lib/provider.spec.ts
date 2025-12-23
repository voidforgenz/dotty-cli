import { MasProvider, createProvider } from './provider.js';
import type { App } from '@dotty/config';

// Mock @dotty/core
jest.mock('@dotty/core', () => ({
  exec: jest.fn(),
  commandExists: jest.fn(),
}));

import { exec, commandExists } from '@dotty/core';

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockCommandExists = commandExists as jest.MockedFunction<typeof commandExists>;

describe('MasProvider', () => {
  let provider: MasProvider;

  beforeEach(() => {
    provider = new MasProvider();
    jest.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should create a MasProvider instance', () => {
      const p = createProvider();
      expect(p).toBeInstanceOf(MasProvider);
    });
  });

  describe('name', () => {
    it('should be "mas"', () => {
      expect(provider.name).toBe('mas');
    });
  });

  describe('isAvailable', () => {
    it('should return true when mas command exists', async () => {
      mockCommandExists.mockResolvedValue(true);
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return false when mas command does not exist', async () => {
      mockCommandExists.mockResolvedValue(false);
      expect(await provider.isAvailable()).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return version string', async () => {
      mockExec.mockResolvedValue({ stdout: '1.8.6\n', stderr: '', exitCode: 0 });
      expect(await provider.getVersion()).toBe('1.8.6');
    });

    it('should return null on error', async () => {
      mockExec.mockRejectedValue(new Error('Command not found'));
      expect(await provider.getVersion()).toBeNull();
    });
  });

  describe('getInstalled - parsing mas list output', () => {
    it('should parse apps without leading spaces', async () => {
      const output = `497799835   Xcode      (26.2)
310633997   WhatsApp   (25.37.76)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await provider.getInstalled();
      expect(apps).toHaveLength(2);
      expect(apps[0]).toEqual({ id: '497799835', name: 'Xcode' });
      expect(apps[1]).toEqual({ id: '310633997', name: 'WhatsApp' });
    });

    it('should parse apps with leading spaces (regression test)', async () => {
      const output = `497799835   Xcode      (26.2)
 310633997  WhatsApp   (25.37.76)`;
      mockExec.mockResolvedValue({ stdout: output, stderr: '', exitCode: 0 });

      const apps = await provider.getInstalled();
      expect(apps).toHaveLength(2);
      expect(apps[0].id).toBe('497799835');
      expect(apps[1].id).toBe('310633997');
    });

    it('should return empty array on error', async () => {
      mockExec.mockRejectedValue(new Error('Command failed'));
      const apps = await provider.getInstalled();
      expect(apps).toEqual([]);
    });
  });

  describe('isInstalled', () => {
    it('should return false for app without mas config', async () => {
      const app: App = { id: 'git', name: 'Git' };
      expect(await provider.isInstalled(app)).toBe(false);
    });

    it('should return true when app ID is in installed list', async () => {
      mockExec.mockResolvedValue({
        stdout: '497799835   Xcode      (26.2)',
        stderr: '',
        exitCode: 0,
      });

      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      expect(await provider.isInstalled(app)).toBe(true);
    });

    it('should return false when app ID is not in installed list', async () => {
      mockExec.mockResolvedValue({
        stdout: '497799835   Xcode      (26.2)',
        stderr: '',
        exitCode: 0,
      });

      const app: App = { id: 'whatsapp', name: 'WhatsApp', mas: { id: 310633997 } };
      expect(await provider.isInstalled(app)).toBe(false);
    });

    it('should return false on error', async () => {
      mockExec.mockRejectedValue(new Error('Command failed'));

      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      expect(await provider.isInstalled(app)).toBe(false);
    });
  });

  describe('install', () => {
    it('should return error for app without mas config', async () => {
      const app: App = { id: 'git', name: 'Git' };
      const result = await provider.install(app);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No mas configuration for this app');
    });

    it('should return success without executing on dry run', async () => {
      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      const result = await provider.install(app, { dryRun: true });
      expect(result.success).toBe(true);
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should call mas install with correct ID', async () => {
      mockExec.mockResolvedValue({ stdout: 'Installed', stderr: '', exitCode: 0 });

      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      const result = await provider.install(app);

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        'mas',
        ['install', '497799835'],
        expect.any(Object)
      );
    });

    it('should return error on install failure', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Not signed in',
        exitCode: 1,
      });

      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      const result = await provider.install(app);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error: Not signed in');
    });

    it('should pass spinner option', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      await provider.install(app, { spinner: 'Installing Xcode...' });

      expect(mockExec).toHaveBeenCalledWith(
        'mas',
        ['install', '497799835'],
        { spinner: 'Installing Xcode...' }
      );
    });
  });

  describe('uninstall', () => {
    it('should always return error (mas does not support uninstall)', async () => {
      const app: App = { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } };
      const result = await provider.uninstall(app);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be uninstalled via mas');
    });
  });
});
