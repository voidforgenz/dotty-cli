import chalk from 'chalk';
import * as p from '@clack/prompts';

/**
 * Custom error class with suggestion for fixing
 */
export class DottyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'DottyError';
  }
}

/**
 * Handle errors gracefully with styled output
 */
export function handleError(error: unknown): never {
  if (error instanceof DottyError) {
    p.log.error(error.message);
    if (error.suggestion) {
      p.log.info(chalk.dim(error.suggestion));
    }
    process.exit(1);
  }

  if (error instanceof Error) {
    p.log.error(error.message);
    if (process.env.DEBUG) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }

  p.log.error('An unexpected error occurred');
  console.error(error);
  process.exit(1);
}

/**
 * Setup global error handlers
 */
export function setupErrorHandlers(): void {
  process.on('uncaughtException', handleError);
  process.on('unhandledRejection', handleError);
}

/**
 * Common error creators
 */
export const errors = {
  commandNotFound: (cmd: string) =>
    new DottyError(
      `Command '${cmd}' not found`,
      'COMMAND_NOT_FOUND',
      `Install ${cmd} first. Run 'dotty doctor' to check dependencies.`
    ),

  chezmoiFailed: (action: string) =>
    new DottyError(
      `Chezmoi ${action} failed`,
      'CHEZMOI_FAILED',
      `Run 'dotty doctor' to check if chezmoi is installed correctly.`
    ),

  brewfileMissing: () =>
    new DottyError(
      'Brewfile not found',
      'BREWFILE_MISSING',
      `Expected Brewfile at ~/.dotfiles/Brewfile`
    ),

  permissionDenied: (path: string) =>
    new DottyError(
      `Permission denied: ${path}`,
      'PERMISSION_DENIED',
      'This operation may require sudo privileges.'
    ),

  notMacOS: () =>
    new DottyError(
      'This command is only available on macOS',
      'NOT_MACOS',
      'Some commands require macOS-specific tools.'
    ),
};
