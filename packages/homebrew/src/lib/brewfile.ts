import fs from 'fs/promises';
import type { BrewfileContents } from '@dottyfiles/core';

/**
 * Parse a Brewfile and extract taps, brews, casks, and MAS apps
 */
export async function parseBrewfile(path: string): Promise<BrewfileContents> {
  const contents: BrewfileContents = {
    taps: [],
    brews: [],
    casks: [],
    mas: [],
  };

  try {
    const file = await fs.readFile(path, 'utf-8');
    const lines = file.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse tap
      const tapMatch = trimmed.match(/^tap\s+"([^"]+)"/);
      if (tapMatch) {
        contents.taps.push(tapMatch[1]);
        continue;
      }

      // Parse brew
      const brewMatch = trimmed.match(/^brew\s+"([^"]+)"/);
      if (brewMatch) {
        contents.brews.push(brewMatch[1]);
        continue;
      }

      // Parse cask
      const caskMatch = trimmed.match(/^cask\s+"([^"]+)"/);
      if (caskMatch) {
        contents.casks.push(caskMatch[1]);
        continue;
      }

      // Parse mas
      const masMatch = trimmed.match(/^mas\s+"([^"]+)",\s*id:\s*(\d+)/);
      if (masMatch) {
        contents.mas.push({ name: masMatch[1], id: masMatch[2] });
        continue;
      }
    }
  } catch {
    // Return empty contents if file doesn't exist
  }

  return contents;
}

/**
 * Check if a cask is in the Brewfile
 */
export function hasCask(brewfile: BrewfileContents, caskName: string): boolean {
  return brewfile.casks.includes(caskName);
}

/**
 * Check if a MAS app is in the Brewfile
 */
export function hasMasApp(
  brewfile: BrewfileContents,
  appName: string
): boolean {
  return brewfile.mas.some((app) => app.name === appName);
}
