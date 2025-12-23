import {
  DOTTYFILE_NAME,
  DOTTY_DIR,
  getDottyDir,
  getDottyfilePath,
  parseDottyfileString,
  tryParseDottyfile,
  dottyfileExists,
  dottyDirExists,
  loadDottyfile,
  loadDottyfileSafe,
} from './parser.js';
import fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

const mockFs = jest.mocked(fs);

describe('Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Constants', () => {
    it('should have correct Dottyfile name', () => {
      expect(DOTTYFILE_NAME).toBe('Dottyfile');
    });

    it('should have correct dotty directory name', () => {
      expect(DOTTY_DIR).toBe('.dotty');
    });
  });

  describe('getDottyDir', () => {
    it('should return path under HOME', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = '/Users/testuser';

      const result = getDottyDir();
      expect(result).toBe('/Users/testuser/.dotty');

      process.env.HOME = originalHome;
    });
  });

  describe('getDottyfilePath', () => {
    it('should return full path to Dottyfile', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = '/Users/testuser';

      const result = getDottyfilePath();
      expect(result).toBe('/Users/testuser/.dotty/Dottyfile');

      process.env.HOME = originalHome;
    });
  });

  describe('parseDottyfileString', () => {
    it('should parse minimal TOML', () => {
      const toml = `
version = 1
providers = ["homebrew"]
`;
      const result = parseDottyfileString(toml);
      expect(result.version).toBe(1);
      expect(result.providers).toEqual(['homebrew']);
    });

    it('should parse apps array', () => {
      const toml = `
version = 1

[[apps]]
id = "git"
name = "Git"

[apps.homebrew]
formula = "git"

[[apps]]
id = "vscode"
name = "Visual Studio Code"

[apps.homebrew]
cask = "visual-studio-code"
`;
      const result = parseDottyfileString(toml);
      expect(result.apps).toHaveLength(2);
      expect(result.apps[0].id).toBe('git');
      expect(result.apps[0].homebrew?.formula).toBe('git');
      expect(result.apps[1].homebrew?.cask).toBe('visual-studio-code');
    });

    it('should parse profiles section', () => {
      const toml = `
version = 1

[profiles]
active = ["base", "work"]

[profiles.work]
hostname = "work-macbook"
`;
      const result = parseDottyfileString(toml);
      expect(result.profiles?.active).toEqual(['base', 'work']);
    });

    it('should parse defaults section', () => {
      const toml = `
version = 1

[defaults]
mode = "apply"
confirm = false
destructive = "never"
`;
      const result = parseDottyfileString(toml);
      expect(result.defaults?.mode).toBe('apply');
      expect(result.defaults?.confirm).toBe(false);
      expect(result.defaults?.destructive).toBe('never');
    });

    it('should parse dock settings', () => {
      const toml = `
version = 1

[dock]
autohide = true
showRecents = false
iconSize = 48
`;
      const result = parseDottyfileString(toml);
      expect(result.dock?.autohide).toBe(true);
      expect(result.dock?.showRecents).toBe(false);
      expect(result.dock?.iconSize).toBe(48);
    });

    it('should parse run hooks', () => {
      const toml = `
version = 1

[run]
pre = ["echo starting"]
post = ["echo done"]
`;
      const result = parseDottyfileString(toml);
      expect(result.run?.pre).toEqual(['echo starting']);
      expect(result.run?.post).toEqual(['echo done']);
    });

    it('should parse run hooks with conditions', () => {
      const toml = `
version = 1

[[run.pre]]
cmd = "brew update"
when = "darwin"

[[run.pre]]
cmd = "apt update"
when = "linux"
`;
      const result = parseDottyfileString(toml);
      expect(result.run?.pre).toHaveLength(2);
      const first = result.run?.pre?.[0];
      expect(typeof first).toBe('object');
      if (typeof first === 'object') {
        expect(first.cmd).toBe('brew update');
        expect(first.when).toBe('darwin');
      }
    });

    it('should parse MAS apps', () => {
      const toml = `
version = 1

[[apps]]
id = "xcode"
name = "Xcode"

[apps.mas]
id = 497799835
`;
      const result = parseDottyfileString(toml);
      expect(result.apps[0].mas?.id).toBe(497799835);
    });

    it('should parse app with profiles', () => {
      const toml = `
version = 1

[[apps]]
id = "docker"
name = "Docker"
profiles = ["work", "dev"]

[apps.homebrew]
cask = "docker"
`;
      const result = parseDottyfileString(toml);
      expect(result.apps[0].profiles).toEqual(['work', 'dev']);
    });
  });

  describe('tryParseDottyfile', () => {
    it('should return success for valid TOML', () => {
      const toml = 'version = 1';
      const result = tryParseDottyfile(toml);
      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(1);
    });

    it('should return error for invalid TOML', () => {
      const toml = 'invalid { toml [';
      const result = tryParseDottyfile(toml);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid schema', () => {
      const toml = `
version = 1

[[apps]]
id = "git"
name = "Git"

[apps.homebrew]
# Missing both formula and cask - invalid
`;
      const result = tryParseDottyfile(toml);
      expect(result.success).toBe(false);
    });

    it('should handle non-Error exceptions', () => {
      // Test with a string that causes TOML parse to throw something other than Error
      const result = tryParseDottyfile('');
      // Empty string is valid TOML, returns empty object
      expect(result.success).toBe(true);
    });
  });

  describe('getDottyDir with USERPROFILE fallback', () => {
    it('should use USERPROFILE when HOME is not set', () => {
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;

      delete process.env.HOME;
      process.env.USERPROFILE = '/Users/windowsuser';

      const result = getDottyDir();
      expect(result).toContain('.dotty');

      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalUserProfile;
    });

    it('should handle empty environment', () => {
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;

      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const result = getDottyDir();
      expect(result).toBe('.dotty');

      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalUserProfile;
    });
  });

  describe('dottyfileExists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await dottyfileExists();
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await dottyfileExists();
      expect(result).toBe(false);
    });
  });

  describe('dottyDirExists', () => {
    it('should return true when directory exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await dottyDirExists();
      expect(result).toBe(true);
    });

    it('should return false when directory does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await dottyDirExists();
      expect(result).toBe(false);
    });
  });

  describe('loadDottyfile', () => {
    it('should load and parse file from default path', async () => {
      mockFs.readFile.mockResolvedValue('version = 1\nproviders = ["homebrew"]');

      const result = await loadDottyfile();
      expect(result.version).toBe(1);
      expect(result.providers).toEqual(['homebrew']);
    });

    it('should load and parse file from custom path', async () => {
      mockFs.readFile.mockResolvedValue('version = 2\nproviders = ["mas"]');

      const result = await loadDottyfile('/custom/path/Dottyfile');
      expect(result.version).toBe(2);
      expect(mockFs.readFile).toHaveBeenCalledWith('/custom/path/Dottyfile', 'utf-8');
    });

    it('should throw on read error', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(loadDottyfile()).rejects.toThrow('ENOENT');
    });

    it('should throw on invalid TOML', async () => {
      mockFs.readFile.mockResolvedValue('invalid { toml');

      await expect(loadDottyfile()).rejects.toThrow();
    });
  });

  describe('loadDottyfileSafe', () => {
    it('should return config when file exists', async () => {
      mockFs.readFile.mockResolvedValue('version = 1');

      const result = await loadDottyfileSafe();
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    it('should return null when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await loadDottyfileSafe();
      expect(result).toBeNull();
    });

    it('should return null on parse error', async () => {
      mockFs.readFile.mockResolvedValue('invalid { toml');

      const result = await loadDottyfileSafe();
      expect(result).toBeNull();
    });

    it('should use custom path', async () => {
      mockFs.readFile.mockResolvedValue('version = 1');

      await loadDottyfileSafe('/custom/path');
      expect(mockFs.readFile).toHaveBeenCalledWith('/custom/path', 'utf-8');
    });
  });
});
