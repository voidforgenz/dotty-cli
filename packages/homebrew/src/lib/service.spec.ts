import { HomebrewService, createHomebrewService } from './service.js';

// Mock @dottyfiles/core
jest.mock('@dottyfiles/core', () => ({
  exec: jest.fn(),
  execStream: jest.fn(),
  commandExists: jest.fn(),
}));

import { exec, execStream, commandExists } from '@dottyfiles/core';

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockExecStream = execStream as jest.MockedFunction<typeof execStream>;
const mockCommandExists = commandExists as jest.MockedFunction<typeof commandExists>;

describe('HomebrewService', () => {
  let service: HomebrewService;

  beforeEach(() => {
    service = new HomebrewService();
    jest.clearAllMocks();
  });

  describe('createHomebrewService', () => {
    it('should create a HomebrewService instance', () => {
      const svc = createHomebrewService();
      expect(svc).toBeInstanceOf(HomebrewService);
    });
  });

  describe('isInstalled', () => {
    it('should return true when brew command exists', async () => {
      mockCommandExists.mockResolvedValue(true);
      expect(await service.isInstalled()).toBe(true);
    });

    it('should return false when brew command does not exist', async () => {
      mockCommandExists.mockResolvedValue(false);
      expect(await service.isInstalled()).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return first line of version output', async () => {
      mockExec.mockResolvedValue({
        stdout: 'Homebrew 4.2.0\nHomebrew/homebrew-core (git revision abc123)\n',
        stderr: '',
        exitCode: 0,
      });
      const version = await service.getVersion();
      expect(version).toBe('Homebrew 4.2.0');
    });

    it('should return null on error', async () => {
      mockExec.mockRejectedValue(new Error('Command not found'));
      const version = await service.getVersion();
      expect(version).toBeNull();
    });
  });

  describe('install', () => {
    it('should call execStream with the install script', async () => {
      mockExecStream.mockResolvedValue(0);
      const exitCode = await service.install();
      expect(exitCode).toBe(0);
      expect(mockExecStream).toHaveBeenCalledWith(
        '/bin/bash',
        expect.arrayContaining(['-c', expect.stringContaining('curl')])
      );
    });
  });

  describe('installFormula', () => {
    it('should call brew install with formula name', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const result = await service.installFormula('git');
      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['install', 'git'],
        expect.any(Object)
      );
    });

    it('should return error on failure', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: No formula found',
        exitCode: 1,
      });

      const result = await service.installFormula('nonexistent');
      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Error: No formula found');
    });

    it('should pass spinner option', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      await service.installFormula('git', { spinner: 'Installing git...' });
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['install', 'git'],
        { spinner: 'Installing git...' }
      );
    });
  });

  describe('installCask', () => {
    it('should call brew install --cask with cask name', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const result = await service.installCask('visual-studio-code');
      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['install', '--cask', 'visual-studio-code'],
        expect.any(Object)
      );
    });

    it('should return error on failure', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Cask not found',
        exitCode: 1,
      });

      const result = await service.installCask('nonexistent');
      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Error: Cask not found');
    });
  });

  describe('isCaskInstalled', () => {
    it('should return true when cask is installed', async () => {
      mockExec.mockResolvedValue({ stdout: 'docker', stderr: '', exitCode: 0 });
      expect(await service.isCaskInstalled('docker')).toBe(true);
    });

    it('should return false when cask is not installed', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Cask not installed',
        exitCode: 1,
      });
      expect(await service.isCaskInstalled('nonexistent')).toBe(false);
    });

    it('should call with silent option', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
      await service.isCaskInstalled('docker');
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['list', '--cask', 'docker'],
        { silent: true }
      );
    });
  });

  describe('bundle', () => {
    it('should call brew bundle with brewfile path', async () => {
      mockExec.mockResolvedValue({ stdout: 'Installed', stderr: '', exitCode: 0 });

      const result = await service.bundle('/path/to/Brewfile');
      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['bundle', '--file=/path/to/Brewfile'],
        expect.any(Object)
      );
    });

    it('should pass silent option', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      await service.bundle('/path/to/Brewfile', { silent: true });
      expect(mockExec).toHaveBeenCalledWith(
        'brew',
        ['bundle', '--file=/path/to/Brewfile'],
        { silent: true }
      );
    });

    it('should return error on failure', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Bundle failed',
        exitCode: 1,
      });

      const result = await service.bundle('/path/to/Brewfile');
      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Error: Bundle failed');
    });
  });

  describe('getInstalledCasks', () => {
    it('should return list of installed casks', async () => {
      mockExec.mockResolvedValue({
        stdout: 'docker\nvisual-studio-code\n1password\n',
        stderr: '',
        exitCode: 0,
      });

      const casks = await service.getInstalledCasks();
      expect(casks).toEqual(['docker', 'visual-studio-code', '1password']);
    });

    it('should return empty array when no casks installed', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const casks = await service.getInstalledCasks();
      expect(casks).toEqual([]);
    });

    it('should filter empty lines', async () => {
      mockExec.mockResolvedValue({
        stdout: 'docker\n\nvisual-studio-code\n\n',
        stderr: '',
        exitCode: 0,
      });

      const casks = await service.getInstalledCasks();
      expect(casks).toEqual(['docker', 'visual-studio-code']);
    });
  });

  describe('getInstalledFormulas', () => {
    it('should return list of installed formulas', async () => {
      mockExec.mockResolvedValue({
        stdout: 'git\nnode\npython@3.12\n',
        stderr: '',
        exitCode: 0,
      });

      const formulas = await service.getInstalledFormulas();
      expect(formulas).toEqual(['git', 'node', 'python@3.12']);
    });

    it('should return empty array when no formulas installed', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const formulas = await service.getInstalledFormulas();
      expect(formulas).toEqual([]);
    });
  });
});
