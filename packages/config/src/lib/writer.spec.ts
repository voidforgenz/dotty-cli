import {
  stringifyDottyfile,
  createDefaultDottyfile,
  addApp,
  removeApp,
  getActiveApps,
  dedupeApps,
  writeDottyfile,
  ensureDottyDir,
} from './writer.js';
import type { Dottyfile, App } from './schema.js';
import fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

// Mock parser.js for getDottyfilePath and getDottyDir
jest.mock('./parser.js', () => ({
  getDottyfilePath: jest.fn(() => '/mock/.dotty/Dottyfile'),
  getDottyDir: jest.fn(() => '/mock/.dotty'),
}));

const mockFs = jest.mocked(fs);

describe('Writer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('stringifyDottyfile', () => {
    it('should convert config to TOML string', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [],
      };
      const result = stringifyDottyfile(config);
      expect(result).toContain('version = 1');
      expect(result).toContain('providers');
    });

    it('should include apps in output', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [
          {
            id: 'git',
            name: 'Git',
            homebrew: { formula: 'git' },
          },
        ],
      };
      const result = stringifyDottyfile(config);
      expect(result).toContain('[[apps]]');
      expect(result).toContain('id = "git"');
      expect(result).toContain('name = "Git"');
    });
  });

  describe('createDefaultDottyfile', () => {
    it('should create valid default config', () => {
      const config = createDefaultDottyfile();
      expect(config.version).toBe(1);
      expect(config.providers).toEqual(['homebrew', 'mas']);
      expect(config.defaults?.mode).toBe('apply');
      expect(config.defaults?.confirm).toBe(true);
      expect(config.defaults?.destructive).toBe('prompt');
      expect(config.profiles?.active).toEqual(['base']);
      expect(config.apps).toEqual([]);
    });
  });

  describe('addApp', () => {
    it('should add new app to empty list', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [],
      };
      const app: App = { id: 'git', name: 'Git', homebrew: { formula: 'git' } };

      const result = addApp(config, app);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].id).toBe('git');
    });

    it('should update existing app by ID', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [{ id: 'git', name: 'Git' }],
      };
      const updatedApp: App = { id: 'git', name: 'Git', homebrew: { formula: 'git' } };

      const result = addApp(config, updatedApp);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].homebrew?.formula).toBe('git');
    });

    it('should replace duplicate if new app has higher score (same homebrew formula)', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [{ id: '', name: 'Git', homebrew: { formula: 'git' } }], // Low score - no ID
      };
      const betterApp: App = {
        id: 'git',
        name: 'Git',
        homebrew: { formula: 'git' },
      };

      const result = addApp(config, betterApp);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].id).toBe('git');
    });

    it('should replace existing app when same ID (update behavior)', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [
          {
            id: 'git',
            name: 'Git',
            homebrew: { formula: 'git' },
          },
        ],
      };
      const updatedApp: App = {
        id: 'git',
        name: 'Git Updated',
        homebrew: { formula: 'git' },
        profiles: ['dev'],
      };

      const result = addApp(config, updatedApp);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].name).toBe('Git Updated');
      expect(result.apps[0].profiles).toEqual(['dev']);
    });

    it('should not add duplicate if existing has higher score (same MAS ID)', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['mas'],
        apps: [
          {
            id: 'xcode',
            name: 'Xcode',
            mas: { id: 497799835 },
          },
        ],
      };
      // Worse app with empty id but same MAS ID
      const worseApp: App = {
        id: '',
        name: '497799835 Xcode',
        mas: { id: 497799835 },
      };

      const result = addApp(config, worseApp);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].id).toBe('xcode'); // Kept the better entry
    });
  });

  describe('removeApp', () => {
    it('should remove app by ID', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [
          { id: 'git', name: 'Git' },
          { id: 'node', name: 'Node.js' },
        ],
      };

      const result = removeApp(config, 'git');
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].id).toBe('node');
    });

    it('should not modify config if app not found', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [{ id: 'git', name: 'Git' }],
      };

      const result = removeApp(config, 'nonexistent');
      expect(result.apps).toHaveLength(1);
    });
  });

  describe('getActiveApps', () => {
    it('should return all apps when no profiles specified', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        profiles: { active: ['base'] },
        apps: [
          { id: 'git', name: 'Git' },
          { id: 'node', name: 'Node.js' },
        ],
      };

      const result = getActiveApps(config);
      expect(result).toHaveLength(2);
    });

    it('should filter apps by active profile', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        profiles: { active: ['base'] },
        apps: [
          { id: 'git', name: 'Git' }, // No profiles = always active
          { id: 'docker', name: 'Docker', profiles: ['work'] }, // Only for 'work'
          { id: 'node', name: 'Node.js', profiles: ['base'] }, // Active for 'base'
        ],
      };

      const result = getActiveApps(config);
      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toContain('git');
      expect(result.map(a => a.id)).toContain('node');
      expect(result.map(a => a.id)).not.toContain('docker');
    });

    it('should include apps matching any active profile', () => {
      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        profiles: { active: ['base', 'work'] },
        apps: [
          { id: 'docker', name: 'Docker', profiles: ['work'] },
          { id: 'slack', name: 'Slack', profiles: ['personal'] },
        ],
      };

      const result = getActiveApps(config);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('docker');
    });
  });

  describe('dedupeApps', () => {
    it('should return empty array for empty input', () => {
      expect(dedupeApps([])).toEqual([]);
    });

    it('should return same apps when no duplicates', () => {
      const apps: App[] = [
        { id: 'git', name: 'Git' },
        { id: 'node', name: 'Node.js' },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(2);
    });

    it('should dedupe by ID', () => {
      const apps: App[] = [
        { id: 'git', name: 'Git' },
        { id: 'git', name: 'Git Version 2' },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
    });

    it('should dedupe by MAS ID', () => {
      const apps: App[] = [
        { id: '', name: '497799835 Xcode (26.0)', mas: { id: 497799835 } },
        { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      // Should keep the better one (with proper id)
      expect(result[0].id).toBe('xcode');
    });

    it('should dedupe by homebrew formula', () => {
      const apps: App[] = [
        { id: 'git1', name: 'Git', homebrew: { formula: 'git' } },
        { id: 'git2', name: 'Git Tool', homebrew: { formula: 'git' } },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
    });

    it('should dedupe by homebrew cask', () => {
      const apps: App[] = [
        { id: 'vscode1', name: 'VS Code', homebrew: { cask: 'visual-studio-code' } },
        { id: 'vscode2', name: 'Visual Studio Code', homebrew: { cask: 'visual-studio-code' } },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
    });

    it('should dedupe by name when no provider info', () => {
      const apps: App[] = [
        { id: 'app1', name: 'My App' },
        { id: 'app2', name: 'My App' },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
    });

    it('should detect ID-in-name duplicates', () => {
      const apps: App[] = [
        { id: '', name: '497799835 Xcode (26.2)' }, // Broken entry with ID in name
        { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } }, // Correct entry
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('xcode');
    });

    it('should prefer entries with higher scores (same formula)', () => {
      const apps: App[] = [
        { id: '', name: 'Git', homebrew: { formula: 'git' } }, // Score: 5 + 20 = 25
        {
          id: 'git',
          name: 'Git',
          homebrew: { formula: 'git' },
        }, // Score: 10 + 5 + 20 = 35
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('git');
      expect(result[0].homebrew?.formula).toBe('git');
    });

    it('should not dedupe apps with same name but different providers', () => {
      // Apps with same name but different provider info are NOT duplicates
      const apps: App[] = [
        { id: '', name: 'Git' }, // No provider info
        { id: 'git', name: 'Git', homebrew: { formula: 'git' } }, // Has provider info
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(2); // Different entries
    });

    it('should handle mixed duplicates in large list', () => {
      const apps: App[] = [
        { id: 'git', name: 'Git', homebrew: { formula: 'git' } },
        { id: 'node', name: 'Node.js', homebrew: { formula: 'node' } },
        { id: '', name: '497799835 Xcode' }, // Broken MAS entry
        { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } }, // Correct MAS entry
        { id: 'git2', name: 'Git Tool', homebrew: { formula: 'git' } }, // Duplicate homebrew formula
        { id: 'docker', name: 'Docker', homebrew: { cask: 'docker' } },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(4); // git, node, xcode, docker
    });

    it('should keep entry with profiles over one without', () => {
      const apps: App[] = [
        { id: 'docker', name: 'Docker', homebrew: { cask: 'docker' } },
        {
          id: 'docker',
          name: 'Docker',
          homebrew: { cask: 'docker' },
          profiles: ['work'],
        },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      expect(result[0].profiles).toEqual(['work']);
    });

    it('should detect reverse ID-in-name duplicates', () => {
      // Test the reverse case: correct entry first, broken entry second
      const apps: App[] = [
        { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } }, // Correct entry first
        { id: '', name: '497799835 Xcode (26.2)' }, // Broken entry with ID in name
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('xcode');
    });

    it('should not match IDs when one is empty', () => {
      const apps: App[] = [
        { id: '', name: 'App 1' },
        { id: '', name: 'App 2' },
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(2); // Empty IDs don't match each other
    });

    it('should score name starting with ID lower', () => {
      const apps: App[] = [
        { id: 'xcode', name: '497799835 Xcode', mas: { id: 497799835 } }, // Name starts with ID
        { id: 'xcode2', name: 'Xcode', mas: { id: 497799835 } }, // Clean name
      ];
      const result = dedupeApps(apps);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Xcode'); // Prefer clean name
    });
  });

  describe('writeDottyfile', () => {
    it('should write config to default path', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [],
      };

      await writeDottyfile(config);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/.dotty/Dottyfile',
        expect.stringContaining('version = 1'),
        'utf-8'
      );
    });

    it('should write config to custom path', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [],
      };

      await writeDottyfile(config, '/custom/path/Dottyfile');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/custom/path/Dottyfile',
        expect.any(String),
        'utf-8'
      );
    });

    it('should dedupe apps before writing', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [
          { id: 'git', name: 'Git', homebrew: { formula: 'git' } },
          { id: 'git', name: 'Git 2', homebrew: { formula: 'git' } }, // Duplicate
        ],
      };

      await writeDottyfile(config);

      // Verify the written content only has one git entry
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const gitMatches = writtenContent.match(/id = "git"/g);
      expect(gitMatches?.length).toBe(1);
    });
  });

  describe('ensureDottyDir', () => {
    it('should create directory with recursive option', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await ensureDottyDir();

      expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/.dotty', { recursive: true });
    });
  });
});
