import { exec } from './exec.js';
import { log } from './ui.js';

/**
 * A hook command - either a simple string or an object with cmd and when
 */
export type HookCommand = string | { cmd: string; when?: string };

/**
 * Get the current platform identifier
 */
export function getPlatform(): string {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return process.platform;
  }
}

/**
 * Check if a hook should run based on its 'when' condition
 */
export function shouldRunHook(hook: HookCommand): boolean {
  if (typeof hook === 'string') {
    return true;
  }

  if (!hook.when) {
    return true;
  }

  const platform = getPlatform();
  const conditions = hook.when.split(',').map(c => c.trim().toLowerCase());

  return conditions.includes(platform);
}

/**
 * Get the command string from a hook
 */
export function getHookCommand(hook: HookCommand): string {
  return typeof hook === 'string' ? hook : hook.cmd;
}

export interface RunHooksOptions {
  dryRun?: boolean;
  silent?: boolean;
}

export interface RunHooksResult {
  success: boolean;
  ran: number;
  skipped: number;
  failed: { cmd: string; error: string }[];
}

/**
 * Run a list of hooks
 */
export async function runHooks(
  hooks: HookCommand[] | undefined,
  phase: 'pre' | 'post',
  options?: RunHooksOptions
): Promise<RunHooksResult> {
  const result: RunHooksResult = {
    success: true,
    ran: 0,
    skipped: 0,
    failed: [],
  };

  if (!hooks || hooks.length === 0) {
    return result;
  }

  if (!options?.silent) {
    log.step(`Running ${phase} hooks...`);
  }

  for (const hook of hooks) {
    const cmd = getHookCommand(hook);

    if (!shouldRunHook(hook)) {
      result.skipped++;
      if (!options?.silent) {
        log.info(`Skipped: ${cmd} (platform mismatch)`);
      }
      continue;
    }

    if (options?.dryRun) {
      if (!options?.silent) {
        log.info(`[DRY RUN] Would run: ${cmd}`);
      }
      result.ran++;
      continue;
    }

    try {
      if (!options?.silent) {
        log.info(`Running: ${cmd}`);
      }

      // Parse the command - split on first space for command and args
      const [command, ...args] = parseCommand(cmd);

      const { exitCode, stderr } = await exec(command, args, {
        silent: options?.silent,
        shell: true,
      });

      if (exitCode !== 0) {
        result.success = false;
        result.failed.push({ cmd, error: stderr || `Exit code ${exitCode}` });
        log.error(`Hook failed: ${cmd}`);
      } else {
        result.ran++;
      }
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.failed.push({ cmd, error: errorMsg });
      log.error(`Hook error: ${cmd} - ${errorMsg}`);
    }
  }

  return result;
}

/**
 * Parse a command string into command and arguments
 * Handles quoted strings properly
 */
function parseCommand(cmd: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuote) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}
