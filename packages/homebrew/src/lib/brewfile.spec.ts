import { parseBrewfile, hasCask, hasMasApp } from './brewfile.js';
import type { BrewfileContents } from '@dottyfiles/core';
import fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

const mockReadFile = jest.mocked(fs.readFile);

describe('Brewfile parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseBrewfile', () => {
    it('should parse empty file', async () => {
      mockReadFile.mockResolvedValue('');
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result).toEqual({ taps: [], brews: [], casks: [], mas: [] });
    });

    it('should ignore comments and empty lines', async () => {
      mockReadFile.mockResolvedValue(`
# This is a comment
   # Another comment

# Empty lines above and below

`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result).toEqual({ taps: [], brews: [], casks: [], mas: [] });
    });

    it('should parse tap entries', async () => {
      mockReadFile.mockResolvedValue(`
tap "homebrew/cask"
tap "homebrew/cask-fonts"
tap "homebrew/bundle"
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.taps).toEqual([
        'homebrew/cask',
        'homebrew/cask-fonts',
        'homebrew/bundle',
      ]);
    });

    it('should parse brew (formula) entries', async () => {
      mockReadFile.mockResolvedValue(`
brew "git"
brew "node"
brew "python@3.12"
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.brews).toEqual(['git', 'node', 'python@3.12']);
    });

    it('should parse cask entries', async () => {
      mockReadFile.mockResolvedValue(`
cask "visual-studio-code"
cask "docker"
cask "1password"
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.casks).toEqual([
        'visual-studio-code',
        'docker',
        '1password',
      ]);
    });

    it('should parse mas (Mac App Store) entries', async () => {
      mockReadFile.mockResolvedValue(`
mas "Xcode", id: 497799835
mas "WhatsApp", id: 310633997
mas "Affinity Designer 2", id: 824171161
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.mas).toEqual([
        { name: 'Xcode', id: '497799835' },
        { name: 'WhatsApp', id: '310633997' },
        { name: 'Affinity Designer 2', id: '824171161' },
      ]);
    });

    it('should parse complete Brewfile with mixed content', async () => {
      mockReadFile.mockResolvedValue(`
# Taps
tap "homebrew/cask"
tap "homebrew/bundle"

# Formulas
brew "git"
brew "node"

# Casks
cask "visual-studio-code"
cask "docker"

# Mac App Store apps
mas "Xcode", id: 497799835
mas "WhatsApp", id: 310633997
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.taps).toEqual(['homebrew/cask', 'homebrew/bundle']);
      expect(result.brews).toEqual(['git', 'node']);
      expect(result.casks).toEqual(['visual-studio-code', 'docker']);
      expect(result.mas).toEqual([
        { name: 'Xcode', id: '497799835' },
        { name: 'WhatsApp', id: '310633997' },
      ]);
    });

    it('should handle leading/trailing whitespace in lines', async () => {
      mockReadFile.mockResolvedValue(`
  tap "homebrew/cask"
	brew "git"
  cask "docker"
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.taps).toEqual(['homebrew/cask']);
      expect(result.brews).toEqual(['git']);
      expect(result.casks).toEqual(['docker']);
    });

    it('should handle mas with varying spacing', async () => {
      mockReadFile.mockResolvedValue(`
mas "Xcode", id: 497799835
mas "WhatsApp",  id:  310633997
mas "Test App",id:123456
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.mas).toHaveLength(3);
      expect(result.mas[0]).toEqual({ name: 'Xcode', id: '497799835' });
      expect(result.mas[1]).toEqual({ name: 'WhatsApp', id: '310633997' });
      expect(result.mas[2]).toEqual({ name: 'Test App', id: '123456' });
    });

    it('should return empty contents if file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const result = await parseBrewfile('/path/to/nonexistent');
      expect(result).toEqual({ taps: [], brews: [], casks: [], mas: [] });
    });

    it('should ignore malformed lines', async () => {
      mockReadFile.mockResolvedValue(`
tap "valid-tap"
invalid line here
brew "valid-brew"
cask without quotes
mas without id
`);
      const result = await parseBrewfile('/path/to/Brewfile');
      expect(result.taps).toEqual(['valid-tap']);
      expect(result.brews).toEqual(['valid-brew']);
      expect(result.casks).toEqual([]);
      expect(result.mas).toEqual([]);
    });
  });

  describe('hasCask', () => {
    it('should return true when cask is present', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: ['visual-studio-code', 'docker'],
        mas: [],
      };
      expect(hasCask(brewfile, 'docker')).toBe(true);
    });

    it('should return false when cask is not present', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: ['visual-studio-code', 'docker'],
        mas: [],
      };
      expect(hasCask(brewfile, '1password')).toBe(false);
    });

    it('should return false for empty casks list', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: [],
        mas: [],
      };
      expect(hasCask(brewfile, 'docker')).toBe(false);
    });
  });

  describe('hasMasApp', () => {
    it('should return true when app is present by name', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: [],
        mas: [
          { name: 'Xcode', id: '497799835' },
          { name: 'WhatsApp', id: '310633997' },
        ],
      };
      expect(hasMasApp(brewfile, 'Xcode')).toBe(true);
    });

    it('should return false when app is not present', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: [],
        mas: [{ name: 'Xcode', id: '497799835' }],
      };
      expect(hasMasApp(brewfile, 'WhatsApp')).toBe(false);
    });

    it('should return false for empty mas list', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: [],
        mas: [],
      };
      expect(hasMasApp(brewfile, 'Xcode')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const brewfile: BrewfileContents = {
        taps: [],
        brews: [],
        casks: [],
        mas: [{ name: 'Xcode', id: '497799835' }],
      };
      expect(hasMasApp(brewfile, 'xcode')).toBe(false);
      expect(hasMasApp(brewfile, 'XCODE')).toBe(false);
    });
  });
});
