import { execa, type Options as ExecaOptions } from 'execa';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';

export interface ExecOptions {
  spinner?: string;
  silent?: boolean;
  cwd?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command with optional spinner
 */
export async function exec(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { spinner: spinnerText, silent, cwd } = options;

  let spinnerInstance: Ora | null = null;
  if (spinnerText && !silent) {
    spinnerInstance = ora(spinnerText).start();
  }

  try {
    const execaOptions: ExecaOptions = {
      cwd,
      reject: false,
    };

    const result = await execa(command, args, execaOptions);

    if (result.exitCode !== 0) {
      spinnerInstance?.fail();
      return {
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        exitCode: result.exitCode ?? 1,
      };
    }

    spinnerInstance?.succeed();
    return {
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
      exitCode: 0,
    };
  } catch (error) {
    spinnerInstance?.fail();
    throw error;
  }
}

/**
 * Execute a command and return stdout only
 */
export async function execOutput(
  command: string,
  args: string[] = [],
  cwd?: string
): Promise<string> {
  const result = await execa(command, args, { cwd, reject: false });
  return result.stdout;
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await execa('which', [command], { reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Execute a command with live output streaming
 */
export async function execStream(
  command: string,
  args: string[] = [],
  options: { cwd?: string } = {}
): Promise<number> {
  const result = await execa(command, args, {
    cwd: options.cwd,
    stdio: 'inherit',
    reject: false,
  });
  return result.exitCode ?? 1;
}

/**
 * Execute a command that requires sudo
 */
export async function execSudo(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  return exec('sudo', [command, ...args], options);
}

/**
 * Log a dry-run message
 */
export function dryRunLog(message: string): void {
  console.log(chalk.blue(`[DRY RUN] ${message}`));
}
