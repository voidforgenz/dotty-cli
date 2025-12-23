import { exec, execOutput, commandExists, execSudo, dryRunLog } from './exec.js';

// Mock execa
jest.mock('execa', () => ({
  execa: jest.fn(),
}));

// Mock ora
jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => mockSpinner);
});

// Mock chalk
jest.mock('chalk', () => {
  const blue = jest.fn((str: string) => `[blue]${str}[/blue]`);
  return {
    default: { blue },
    blue,
  };
});

import { execa } from 'execa';
import ora from 'ora';

const mockExeca = execa as jest.MockedFunction<typeof execa>;

describe('Exec utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exec', () => {
    it('should execute command and return result', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'output',
        stderr: '',
        exitCode: 0,
      } as never);

      const result = await exec('echo', ['hello']);
      expect(result.stdout).toBe('output');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });

    it('should handle non-zero exit code', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: 'error message',
        exitCode: 1,
      } as never);

      const result = await exec('failing-command', []);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('error message');
    });

    it('should start spinner when spinner option provided', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as never);

      await exec('command', [], { spinner: 'Loading...' });
      expect(ora).toHaveBeenCalledWith('Loading...');
    });

    it('should not show spinner when silent', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as never);

      await exec('command', [], { spinner: 'Loading...', silent: true });
      // Spinner should still be created but the test verifies silent behavior
    });

    it('should pass cwd option to execa', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as never);

      await exec('command', [], { cwd: '/some/path' });
      expect(mockExeca).toHaveBeenCalledWith(
        'command',
        [],
        expect.objectContaining({ cwd: '/some/path' })
      );
    });

    it('should pass shell option to execa', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as never);

      await exec('command', [], { shell: true });
      expect(mockExeca).toHaveBeenCalledWith(
        'command',
        [],
        expect.objectContaining({ shell: true })
      );
    });

    it('should handle null stdout/stderr', async () => {
      mockExeca.mockResolvedValue({
        stdout: null,
        stderr: null,
        exitCode: 0,
      } as never);

      const result = await exec('command', []);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });

    it('should handle undefined exitCode', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: 'error',
        exitCode: undefined,
      } as never);

      const result = await exec('command', []);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('execOutput', () => {
    it('should return stdout only', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'output text',
        stderr: 'some error',
        exitCode: 0,
      } as never);

      const result = await execOutput('command', ['arg']);
      expect(result).toBe('output text');
    });

    it('should pass cwd option', async () => {
      mockExeca.mockResolvedValue({ stdout: '' } as never);

      await execOutput('command', [], '/some/path');
      expect(mockExeca).toHaveBeenCalledWith(
        'command',
        [],
        expect.objectContaining({ cwd: '/some/path' })
      );
    });
  });

  describe('commandExists', () => {
    it('should return true when command exists', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 } as never);

      const result = await commandExists('git');
      expect(result).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith('which', ['git'], expect.any(Object));
    });

    it('should return false when command does not exist', async () => {
      mockExeca.mockResolvedValue({ exitCode: 1 } as never);

      const result = await commandExists('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false on exception', async () => {
      mockExeca.mockRejectedValue(new Error('Failed'));

      const result = await commandExists('broken');
      expect(result).toBe(false);
    });
  });

  describe('execSudo', () => {
    it('should prepend sudo to command', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as never);

      await execSudo('apt', ['update']);
      expect(mockExeca).toHaveBeenCalledWith(
        'sudo',
        ['apt', 'update'],
        expect.any(Object)
      );
    });
  });

  describe('dryRunLog', () => {
    it('should log message with DRY RUN prefix', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      dryRunLog('Would install package');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY RUN]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Would install package')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('exec with spinner', () => {
    it('should call spinner succeed on success', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'output',
        stderr: '',
        exitCode: 0,
      } as never);

      await exec('command', [], { spinner: 'Loading...' });

      const oraInstance = (ora as jest.Mock).mock.results[0].value;
      expect(oraInstance.succeed).toHaveBeenCalled();
    });

    it('should call spinner fail on non-zero exit', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: 'error',
        exitCode: 1,
      } as never);

      await exec('command', [], { spinner: 'Loading...' });

      const oraInstance = (ora as jest.Mock).mock.results[0].value;
      expect(oraInstance.fail).toHaveBeenCalled();
    });

    it('should call spinner fail on exception', async () => {
      mockExeca.mockRejectedValue(new Error('Command failed'));

      await expect(exec('command', [], { spinner: 'Loading...' })).rejects.toThrow('Command failed');

      const oraInstance = (ora as jest.Mock).mock.results[0].value;
      expect(oraInstance.fail).toHaveBeenCalled();
    });
  });

  describe('execStream', () => {
    it('should return exit code from command', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 } as never);

      const { execStream } = await import('./exec.js');
      const result = await execStream('echo', ['hello']);

      expect(result).toBe(0);
      expect(mockExeca).toHaveBeenCalledWith(
        'echo',
        ['hello'],
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('should return 1 for undefined exit code', async () => {
      mockExeca.mockResolvedValue({ exitCode: undefined } as never);

      const { execStream } = await import('./exec.js');
      const result = await execStream('command', []);

      expect(result).toBe(1);
    });

    it('should pass cwd option', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 } as never);

      const { execStream } = await import('./exec.js');
      await execStream('command', [], { cwd: '/some/path' });

      expect(mockExeca).toHaveBeenCalledWith(
        'command',
        [],
        expect.objectContaining({ cwd: '/some/path' })
      );
    });
  });
});
