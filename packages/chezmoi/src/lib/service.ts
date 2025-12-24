import { exec, execOutput, execStream, commandExists } from '@dottyfiles/core';

/**
 * Chezmoi service - provides wrapper functionality for chezmoi operations
 */
export class ChezmoiService {

  /**
   * Check if chezmoi is installed
   */
  async isInstalled(): Promise<boolean> {
    return commandExists('chezmoi');
  }

  /**
   * Get chezmoi version
   */
  async getVersion(): Promise<string | null> {
    try {
      const output = await execOutput('chezmoi', ['--version']);
      return output.trim().split('\n')[0];
    } catch {
      return null;
    }
  }

  /**
   * Get list of managed files
   */
  async getManagedFiles(): Promise<string[]> {
    const { stdout } = await exec('chezmoi', ['managed']);
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Get status of changes
   */
  async getStatus(): Promise<{ files: string[]; runScripts: string[] }> {
    const { stdout } = await exec('chezmoi', ['status']);
    const allChanges = stdout.trim().split('\n').filter(Boolean);

    const runScripts = allChanges.filter(
      (line) => line.startsWith('R ') || line.startsWith(' R')
    );
    const files = allChanges.filter(
      (line) => !line.startsWith('R ') && !line.startsWith(' R')
    );

    return { files, runScripts };
  }

  /**
   * Show diff of pending changes
   */
  async showDiff(): Promise<number> {
    return execStream('chezmoi', ['diff']);
  }

  /**
   * Apply pending changes
   */
  async apply(
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('chezmoi', ['apply'], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Update from remote (pull and apply)
   */
  async update(
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('chezmoi', ['update'], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Add a file to chezmoi management
   */
  async add(
    file: string,
    options: { spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const result = await exec('chezmoi', ['add', file], {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Edit a file in chezmoi
   */
  async edit(file: string): Promise<number> {
    return execStream('chezmoi', ['edit', file]);
  }

  /**
   * Initialize chezmoi with a repo
   */
  async init(
    repo: string,
    options: { apply?: boolean; spinner?: string } = {}
  ): Promise<{ success: boolean; stderr?: string }> {
    const args = ['init'];
    if (options.apply) {
      args.push('--apply');
    }
    args.push(repo);

    const result = await exec('chezmoi', args, {
      spinner: options.spinner,
    });

    return {
      success: result.exitCode === 0,
      stderr: result.stderr || undefined,
    };
  }

  /**
   * Get the chezmoi source directory path
   */
  async getSourcePath(): Promise<string> {
    const output = await execOutput('chezmoi', ['source-path']);
    return output.trim();
  }
}

/**
 * Create a default chezmoi service instance
 */
export function createChezmoiService(): ChezmoiService {
  return new ChezmoiService();
}
