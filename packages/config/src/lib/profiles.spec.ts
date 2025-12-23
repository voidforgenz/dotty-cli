import {
  getHostname,
  getAllProfileNames,
  getProfileDefinition,
  shouldAutoActivate,
  getAutoActivatedProfiles,
  resolveProfileChain,
  getEffectiveProfiles,
  getEffectiveSettings,
  setActiveProfiles,
  addActiveProfile,
  removeActiveProfile,
} from './profiles.js';
import type { Dottyfile } from './schema.js';

// Mock os.hostname for consistent tests
jest.mock('os', () => ({
  hostname: () => 'test-machine.local',
}));

describe('Profiles', () => {
  describe('getHostname', () => {
    it('should return lowercase hostname without .local suffix', () => {
      const result = getHostname();
      expect(result).toBe('test-machine');
    });
  });

  describe('getAllProfileNames', () => {
    it('should always include base', () => {
      const config: Dottyfile = { version: 1, providers: [], apps: [] };
      const result = getAllProfileNames(config);
      expect(result).toContain('base');
    });

    it('should include active profiles', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base', 'work', 'dev'] },
        apps: [],
      };
      const result = getAllProfileNames(config);
      expect(result).toContain('work');
      expect(result).toContain('dev');
    });

    it('should include profiles from definitions', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { hostname: 'work-mac' },
          personal: { hostname: 'home-mac' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getAllProfileNames(config);
      expect(result).toContain('work');
      expect(result).toContain('personal');
    });

    it('should include profiles from apps', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        apps: [
          { id: 'docker', name: 'Docker', profiles: ['dev', 'work'] },
          { id: 'slack', name: 'Slack', profiles: ['office'] },
        ],
      };
      const result = getAllProfileNames(config);
      expect(result).toContain('dev');
      expect(result).toContain('work');
      expect(result).toContain('office');
    });

    it('should return sorted unique profiles', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base', 'work', 'base'] },
        apps: [{ id: 'app', name: 'App', profiles: ['work', 'dev'] }],
      };
      const result = getAllProfileNames(config);
      expect(result).toEqual(['base', 'dev', 'work']);
    });
  });

  describe('getProfileDefinition', () => {
    it('should return undefined for missing profile', () => {
      const config: Dottyfile = { version: 1, providers: [], apps: [] };
      const result = getProfileDefinition(config, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined when no profiles section', () => {
      const config: Dottyfile = { version: 1, providers: [], apps: [] };
      const result = getProfileDefinition(config, 'work');
      expect(result).toBeUndefined();
    });

    it('should return profile definition', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { hostname: 'work-mac', extends: 'base' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getProfileDefinition(config, 'work');
      expect(result?.hostname).toBe('work-mac');
      expect(result?.extends).toBe('base');
    });
  });

  describe('shouldAutoActivate', () => {
    it('should return false for undefined definition', () => {
      expect(shouldAutoActivate(undefined)).toBe(false);
    });

    it('should return false for definition without hostname', () => {
      expect(shouldAutoActivate({ extends: 'base' })).toBe(false);
    });

    it('should return true when hostname matches', () => {
      expect(shouldAutoActivate({ hostname: 'test-machine' }, 'test-machine')).toBe(true);
    });

    it('should return false when hostname does not match', () => {
      expect(shouldAutoActivate({ hostname: 'other-machine' }, 'test-machine')).toBe(false);
    });

    it('should handle hostname array', () => {
      expect(
        shouldAutoActivate({ hostname: ['work-mac', 'test-machine'] }, 'test-machine')
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(shouldAutoActivate({ hostname: 'Test-Machine' }, 'test-machine')).toBe(true);
    });
  });

  describe('getAutoActivatedProfiles', () => {
    it('should return empty array when no profiles match hostname', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { hostname: 'work-mac' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getAutoActivatedProfiles(config);
      expect(result).toEqual([]);
    });

    it('should return profiles matching current hostname', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { hostname: 'work-mac' },
          test: { hostname: 'test-machine' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getAutoActivatedProfiles(config);
      expect(result).toContain('test');
      expect(result).not.toContain('work');
    });
  });

  describe('resolveProfileChain', () => {
    it('should return single profile when no extends', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base'] },
        apps: [],
      };
      const result = resolveProfileChain(config, 'base');
      expect(result).toEqual(['base']);
    });

    it('should resolve simple inheritance', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { extends: 'base' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = resolveProfileChain(config, 'work');
      expect(result).toEqual(['base', 'work']);
    });

    it('should resolve multi-level inheritance', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          dev: { extends: 'base' },
          work: { extends: 'dev' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = resolveProfileChain(config, 'work');
      expect(result).toEqual(['base', 'dev', 'work']);
    });

    it('should handle circular dependencies', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          a: { extends: 'b' },
          b: { extends: 'a' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = resolveProfileChain(config, 'a');
      // Should not infinite loop and should return partial chain
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getEffectiveProfiles', () => {
    it('should return base when no profiles defined', () => {
      const config: Dottyfile = { version: 1, providers: [], apps: [] };
      const result = getEffectiveProfiles(config);
      expect(result).toContain('base');
    });

    it('should include explicitly active profiles', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base', 'work'] },
        apps: [],
      };
      const result = getEffectiveProfiles(config);
      expect(result).toContain('base');
      expect(result).toContain('work');
    });

    it('should include inherited profiles', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['work'],
          work: { extends: 'dev' },
          dev: { extends: 'base' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getEffectiveProfiles(config);
      expect(result).toContain('base');
      expect(result).toContain('dev');
      expect(result).toContain('work');
    });

    it('should include auto-activated profiles and their inheritance', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          test: { hostname: 'test-machine', extends: 'dev' },
          dev: {},
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getEffectiveProfiles(config);
      expect(result).toContain('test');
      expect(result).toContain('dev');
    });
  });

  describe('getEffectiveSettings', () => {
    it('should return base config settings', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        dock: { autohide: true },
        keyboard: { keyRepeat: 'fast' },
        apps: [],
      };
      const result = getEffectiveSettings(config);
      expect(result.dock?.autohide).toBe(true);
      expect(result.keyboard?.keyRepeat).toBe('fast');
    });

    it('should merge profile settings over base', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        dock: { autohide: true, iconSize: 48 },
        profiles: {
          active: ['work'],
          work: { dock: { autohide: false } },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getEffectiveSettings(config);
      expect(result.dock?.autohide).toBe(false); // Overridden by profile
      expect(result.dock?.iconSize).toBe(48); // Inherited from base
    });

    it('should apply settings in inheritance order', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        dock: { iconSize: 48 },
        profiles: {
          active: ['work'],
          dev: { dock: { autohide: true } },
          work: { extends: 'dev', dock: { showRecents: false } },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = getEffectiveSettings(config);
      expect(result.dock?.iconSize).toBe(48); // From base
      expect(result.dock?.autohide).toBe(true); // From dev
      expect(result.dock?.showRecents).toBe(false); // From work
    });
  });

  describe('setActiveProfiles', () => {
    it('should set active profiles', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base'] },
        apps: [],
      };
      const result = setActiveProfiles(config, ['work', 'dev']);
      expect(result.profiles?.active).toEqual(['work', 'dev']);
    });

    it('should preserve other profile definitions', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: {
          active: ['base'],
          work: { hostname: 'work-mac' },
        } as Dottyfile['profiles'],
        apps: [],
      };
      const result = setActiveProfiles(config, ['work']);
      expect((result.profiles as Record<string, unknown>).work).toBeDefined();
    });
  });

  describe('addActiveProfile', () => {
    it('should add new profile to active list', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base'] },
        apps: [],
      };
      const result = addActiveProfile(config, 'work');
      expect(result.profiles?.active).toEqual(['base', 'work']);
    });

    it('should not add duplicate profile', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base', 'work'] },
        apps: [],
      };
      const result = addActiveProfile(config, 'work');
      expect(result.profiles?.active).toEqual(['base', 'work']);
    });

    it('should handle missing profiles section', () => {
      const config: Dottyfile = { version: 1, providers: [], apps: [] };
      const result = addActiveProfile(config, 'work');
      expect(result.profiles?.active).toContain('work');
      expect(result.profiles?.active).toContain('base');
    });
  });

  describe('removeActiveProfile', () => {
    it('should remove profile from active list', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base', 'work', 'dev'] },
        apps: [],
      };
      const result = removeActiveProfile(config, 'work');
      expect(result.profiles?.active).toEqual(['base', 'dev']);
    });

    it('should ensure at least base remains', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['work'] },
        apps: [],
      };
      const result = removeActiveProfile(config, 'work');
      expect(result.profiles?.active).toEqual(['base']);
    });

    it('should not fail when profile not in list', () => {
      const config: Dottyfile = {
        version: 1,
        providers: [],
        profiles: { active: ['base'] },
        apps: [],
      };
      const result = removeActiveProfile(config, 'nonexistent');
      expect(result.profiles?.active).toEqual(['base']);
    });
  });
});
