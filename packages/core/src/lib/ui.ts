import * as p from '@clack/prompts';
import chalk from 'chalk';

/**
 * Show the CLI intro banner
 */
export function showIntro(name = 'dotty'): void {
  console.log();
  p.intro(chalk.bgCyan.black(` ${name} `));
}

/**
 * Show the CLI outro message
 */
export function showOutro(message?: string): void {
  p.outro(message || chalk.green('Done!'));
}

/**
 * Prompt for confirmation
 */
export async function confirm(
  message: string,
  defaultValue = false
): Promise<boolean> {
  const result = await p.confirm({
    message,
    initialValue: defaultValue,
  });

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
}

/**
 * Show a select menu
 */
export async function select<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[]
): Promise<T> {
  const result = await p.select({
    message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: options as any,
  });

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return result as T;
}

/**
 * Show a multi-select menu
 */
export async function multiSelect<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[]
): Promise<T[]> {
  const result = await p.multiselect({
    message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: options as any,
    required: false,
  });

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return result as T[];
}

/**
 * Show a text input prompt
 */
export async function text(
  message: string,
  placeholder?: string
): Promise<string> {
  const result = await p.text({
    message,
    placeholder,
  });

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
}

// Log helpers using clack's styled logging
export const log = {
  success: (message: string) => p.log.success(message),
  error: (message: string) => p.log.error(message),
  warn: (message: string) => p.log.warn(message),
  info: (message: string) => p.log.info(message),
  step: (message: string) => p.log.step(message),
  message: (message: string) => p.log.message(message),
};

/**
 * Create a spinner that can be controlled
 */
export function spinner() {
  return p.spinner();
}

/**
 * Show a note/box with content
 */
export function note(message: string, title?: string): void {
  p.note(message, title);
}

/**
 * Format a list of items for display
 */
export function formatList(items: string[], prefix = '•'): string {
  return items.map((item) => `  ${chalk.dim(prefix)} ${item}`).join('\n');
}

/**
 * Show a success check mark with message
 */
export function check(message: string): void {
  console.log(`  ${chalk.green('✓')} ${message}`);
}

/**
 * Show an error X with message
 */
export function cross(message: string): void {
  console.log(`  ${chalk.red('✗')} ${message}`);
}

/**
 * Show a warning with message
 */
export function warning(message: string): void {
  console.log(`  ${chalk.yellow('!')} ${message}`);
}
