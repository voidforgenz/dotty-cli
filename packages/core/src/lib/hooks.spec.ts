import {
  getPlatform,
  shouldRunHook,
  getHookCommand,
  runHooks,
  type HookCommand,
} from './hooks.js';

// Mock exec
jest.mock('./exec.js', () => ({
  exec: jest.fn(),
}));

// Mock ui
jest.mock('./ui.js', () => ({
  log: {
    step: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { exec } from './exec.js';
import { log } from './ui.js';

const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatform', () => {
    const originalPlatform = process.platform;

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return macos for darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(getPlatform()).toBe('macos');
    });

    it('should return windows for win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(getPlatform()).toBe('windows');
    });

    it('should return linux for linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(getPlatform()).toBe('linux');
    });

    it('should return platform name for unknown platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      expect(getPlatform()).toBe('freebsd');
    });
  });

  describe('shouldRunHook', () => {
    const originalPlatform = process.platform;

    beforeEach(() => {
      // Set to darwin for tests
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return true for string hooks', () => {
      expect(shouldRunHook('echo hello')).toBe(true);
    });

    it('should return true for object hooks without when', () => {
      expect(shouldRunHook({ cmd: 'echo hello' })).toBe(true);
    });

    it('should return true when platform matches', () => {
      expect(shouldRunHook({ cmd: 'brew update', when: 'macos' })).toBe(true);
    });

    it('should return false when platform does not match', () => {
      expect(shouldRunHook({ cmd: 'apt update', when: 'linux' })).toBe(false);
    });

    it('should handle multiple platforms in when', () => {
      expect(shouldRunHook({ cmd: 'echo hello', when: 'linux, macos' })).toBe(true);
      expect(shouldRunHook({ cmd: 'echo hello', when: 'linux, windows' })).toBe(false);
    });

    it('should be case insensitive for platform names', () => {
      expect(shouldRunHook({ cmd: 'brew update', when: 'MACOS' })).toBe(true);
      expect(shouldRunHook({ cmd: 'brew update', when: 'MacOS' })).toBe(true);
    });
  });

  describe('getHookCommand', () => {
    it('should return string as-is', () => {
      expect(getHookCommand('echo hello')).toBe('echo hello');
    });

    it('should return cmd from object', () => {
      expect(getHookCommand({ cmd: 'brew update', when: 'macos' })).toBe('brew update');
    });
  });

  describe('runHooks', () => {
    const originalPlatform = process.platform;

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return success for empty hooks', async () => {
      const result = await runHooks(undefined, 'pre');
      expect(result.success).toBe(true);
      expect(result.ran).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should return success for empty array', async () => {
      const result = await runHooks([], 'pre');
      expect(result.success).toBe(true);
      expect(result.ran).toBe(0);
    });

    it('should run string hooks', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const hooks: HookCommand[] = ['echo hello'];
      const result = await runHooks(hooks, 'pre');

      expect(result.success).toBe(true);
      expect(result.ran).toBe(1);
      expect(mockExec).toHaveBeenCalledWith('echo', ['hello'], expect.any(Object));
    });

    it('should skip hooks when platform does not match', async () => {
      const hooks: HookCommand[] = [
        { cmd: 'apt update', when: 'linux' },
      ];
      const result = await runHooks(hooks, 'pre', { silent: true });

      expect(result.success).toBe(true);
      expect(result.ran).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should not execute in dry run mode', async () => {
      const hooks: HookCommand[] = ['echo hello'];
      const result = await runHooks(hooks, 'pre', { dryRun: true, silent: true });

      expect(result.success).toBe(true);
      expect(result.ran).toBe(1);
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should handle failed hooks', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
      });

      const hooks: HookCommand[] = ['failing-command'];
      const result = await runHooks(hooks, 'pre', { silent: true });

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].cmd).toBe('failing-command');
    });

    it('should handle hook exceptions', async () => {
      mockExec.mockRejectedValue(new Error('Execution error'));

      const hooks: HookCommand[] = ['broken-command'];
      const result = await runHooks(hooks, 'pre', { silent: true });

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Execution error');
    });

    it('should continue after failed hook', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: '', stderr: 'Error', exitCode: 1 })
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 });

      const hooks: HookCommand[] = ['failing', 'succeeding'];
      const result = await runHooks(hooks, 'pre', { silent: true });

      expect(result.success).toBe(false);
      expect(result.ran).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it('should run platform-conditional hooks correctly', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const hooks: HookCommand[] = [
        { cmd: 'brew update', when: 'macos' },
        { cmd: 'apt update', when: 'linux' },
        'echo always',
      ];
      const result = await runHooks(hooks, 'pre', { silent: true });

      expect(result.ran).toBe(2); // brew and echo
      expect(result.skipped).toBe(1); // apt
    });

    it('should log step message for non-silent mode', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const hooks: HookCommand[] = ['echo hello'];
      await runHooks(hooks, 'pre');

      expect(log.step).toHaveBeenCalledWith('Running pre hooks...');
    });

    it('should log step message for post hooks', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      const hooks: HookCommand[] = ['echo hello'];
      await runHooks(hooks, 'post');

      expect(log.step).toHaveBeenCalledWith('Running post hooks...');
    });
  });

  describe('parseCommand (via runHooks)', () => {
    beforeEach(() => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    });

    it('should parse simple command', async () => {
      await runHooks(['echo hello'], 'pre', { silent: true });
      expect(mockExec).toHaveBeenCalledWith('echo', ['hello'], expect.any(Object));
    });

    it('should parse command with multiple args', async () => {
      await runHooks(['git commit -m test'], 'pre', { silent: true });
      expect(mockExec).toHaveBeenCalledWith('git', ['commit', '-m', 'test'], expect.any(Object));
    });

    it('should handle quoted strings', async () => {
      await runHooks(['echo "hello world"'], 'pre', { silent: true });
      expect(mockExec).toHaveBeenCalledWith('echo', ['hello world'], expect.any(Object));
    });

    it('should handle single quoted strings', async () => {
      await runHooks(["echo 'hello world'"], 'pre', { silent: true });
      expect(mockExec).toHaveBeenCalledWith('echo', ['hello world'], expect.any(Object));
    });

    it('should handle complex command with mixed quotes', async () => {
      await runHooks(['git commit -m "initial commit"'], 'pre', { silent: true });
      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'initial commit'],
        expect.any(Object)
      );
    });
  });
});
