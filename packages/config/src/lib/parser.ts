import fs from 'fs/promises';
import path from 'path';
import TOML from '@iarna/toml';
import { DottyfileSchema, type Dottyfile } from './schema.js';

export const DOTTYFILE_NAME = 'Dottyfile';
export const DOTTY_DIR = '.dotty';

/**
 * Get the path to the user's .dotty directory
 */
export function getDottyDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, DOTTY_DIR);
}

/**
 * Get the path to the Dottyfile
 */
export function getDottyfilePath(): string {
  return path.join(getDottyDir(), DOTTYFILE_NAME);
}

/**
 * Check if a Dottyfile exists
 */
export async function dottyfileExists(): Promise<boolean> {
  try {
    await fs.access(getDottyfilePath());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the .dotty directory exists
 */
export async function dottyDirExists(): Promise<boolean> {
  try {
    await fs.access(getDottyDir());
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a TOML string into a Dottyfile object
 */
export function parseDottyfileString(content: string): Dottyfile {
  const parsed = TOML.parse(content);
  return DottyfileSchema.parse(parsed);
}

/**
 * Load and parse the Dottyfile from disk
 */
export async function loadDottyfile(filePath?: string): Promise<Dottyfile> {
  const targetPath = filePath || getDottyfilePath();
  const content = await fs.readFile(targetPath, 'utf-8');
  return parseDottyfileString(content);
}

/**
 * Load the Dottyfile, returning null if it doesn't exist
 */
export async function loadDottyfileSafe(filePath?: string): Promise<Dottyfile | null> {
  try {
    return await loadDottyfile(filePath);
  } catch {
    return null;
  }
}

export interface ParseResult {
  success: boolean;
  data?: Dottyfile;
  error?: string;
}

/**
 * Parse a Dottyfile string with error handling
 */
export function tryParseDottyfile(content: string): ParseResult {
  try {
    const data = parseDottyfileString(content);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return { success: false, error: message };
  }
}
