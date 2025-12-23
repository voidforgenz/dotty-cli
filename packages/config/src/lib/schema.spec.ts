import {
  AppSchema,
  HomebrewAppSchema,
  MasAppSchema,
  DefaultsSchema,
  ProfilesSchema,
  DottyfileSchema,
  DockSettingsSchema,
  KeyboardSettingsSchema,
  TrackpadSettingsSchema,
  MouseSettingsSchema,
  ProfileDefinitionSchema,
  RunCommandSchema,
  RunHooksSchema,
} from './schema.js';

describe('Schema Validation', () => {
  describe('HomebrewAppSchema', () => {
    it('should accept formula only', () => {
      const result = HomebrewAppSchema.parse({ formula: 'git' });
      expect(result.formula).toBe('git');
    });

    it('should accept cask only', () => {
      const result = HomebrewAppSchema.parse({ cask: 'visual-studio-code' });
      expect(result.cask).toBe('visual-studio-code');
    });

    it('should accept both formula and cask', () => {
      const result = HomebrewAppSchema.parse({ formula: 'git', cask: 'github' });
      expect(result.formula).toBe('git');
      expect(result.cask).toBe('github');
    });

    it('should reject empty object', () => {
      expect(() => HomebrewAppSchema.parse({})).toThrow();
    });
  });

  describe('MasAppSchema', () => {
    it('should accept valid id', () => {
      const result = MasAppSchema.parse({ id: 497799835 });
      expect(result.id).toBe(497799835);
    });

    it('should reject missing id', () => {
      expect(() => MasAppSchema.parse({})).toThrow();
    });

    it('should reject string id', () => {
      expect(() => MasAppSchema.parse({ id: '497799835' })).toThrow();
    });
  });

  describe('AppSchema', () => {
    it('should accept minimal app', () => {
      const result = AppSchema.parse({ id: 'xcode', name: 'Xcode' });
      expect(result.id).toBe('xcode');
      expect(result.name).toBe('Xcode');
    });

    it('should accept app with homebrew config', () => {
      const result = AppSchema.parse({
        id: 'git',
        name: 'Git',
        homebrew: { formula: 'git' },
      });
      expect(result.homebrew?.formula).toBe('git');
    });

    it('should accept app with mas config', () => {
      const result = AppSchema.parse({
        id: 'xcode',
        name: 'Xcode',
        mas: { id: 497799835 },
      });
      expect(result.mas?.id).toBe(497799835);
    });

    it('should accept app with profiles', () => {
      const result = AppSchema.parse({
        id: 'docker',
        name: 'Docker',
        profiles: ['work', 'dev'],
      });
      expect(result.profiles).toEqual(['work', 'dev']);
    });

    it('should accept app with installer', () => {
      const result = AppSchema.parse({
        id: 'custom-app',
        name: 'Custom App',
        installer: 'curl -sSL https://example.com/install.sh | bash',
      });
      expect(result.installer).toBeDefined();
    });
  });

  describe('DefaultsSchema', () => {
    it('should use default values', () => {
      const result = DefaultsSchema.parse({});
      expect(result.mode).toBe('apply');
      expect(result.confirm).toBe(true);
      expect(result.destructive).toBe('prompt');
    });

    it('should accept valid mode values', () => {
      expect(DefaultsSchema.parse({ mode: 'apply' }).mode).toBe('apply');
      expect(DefaultsSchema.parse({ mode: 'pull' }).mode).toBe('pull');
      expect(DefaultsSchema.parse({ mode: 'push' }).mode).toBe('push');
    });

    it('should accept valid destructive values', () => {
      expect(DefaultsSchema.parse({ destructive: 'never' }).destructive).toBe('never');
      expect(DefaultsSchema.parse({ destructive: 'prompt' }).destructive).toBe('prompt');
      expect(DefaultsSchema.parse({ destructive: 'always' }).destructive).toBe('always');
    });
  });

  describe('ProfilesSchema', () => {
    it('should use base as default active profile', () => {
      const result = ProfilesSchema.parse({});
      expect(result.active).toEqual(['base']);
    });

    it('should accept active profiles', () => {
      const result = ProfilesSchema.parse({ active: ['work', 'dev'] });
      expect(result.active).toEqual(['work', 'dev']);
    });

    it('should allow additional properties for profile definitions', () => {
      const result = ProfilesSchema.parse({
        active: ['base'],
        work: { hostname: 'work-mac' },
      });
      expect(result.active).toEqual(['base']);
      expect((result as Record<string, unknown>).work).toBeDefined();
    });
  });

  describe('ProfileDefinitionSchema', () => {
    it('should accept extends', () => {
      const result = ProfileDefinitionSchema.parse({ extends: 'base' });
      expect(result.extends).toBe('base');
    });

    it('should accept single hostname', () => {
      const result = ProfileDefinitionSchema.parse({ hostname: 'work-mac' });
      expect(result.hostname).toBe('work-mac');
    });

    it('should accept hostname array', () => {
      const result = ProfileDefinitionSchema.parse({ hostname: ['work-mac', 'office-mac'] });
      expect(result.hostname).toEqual(['work-mac', 'office-mac']);
    });

    it('should accept profile-specific settings', () => {
      const result = ProfileDefinitionSchema.parse({
        dock: { autohide: true },
        keyboard: { keyRepeat: 'fast' },
      });
      expect(result.dock?.autohide).toBe(true);
      expect(result.keyboard?.keyRepeat).toBe('fast');
    });
  });

  describe('DockSettingsSchema', () => {
    it('should accept all valid settings', () => {
      const result = DockSettingsSchema.parse({
        autohide: true,
        showRecents: false,
        iconSize: 48,
        apps: ['/Applications/Safari.app'],
        folders: ['~/Downloads'],
        foldersDisplay: 'stack',
        foldersView: 'grid',
      });
      expect(result.autohide).toBe(true);
      expect(result.iconSize).toBe(48);
    });
  });

  describe('KeyboardSettingsSchema', () => {
    it('should accept valid keyRepeat values', () => {
      const values = ['off', 'slow', 'medium', 'fast', 'very-fast'];
      for (const value of values) {
        const result = KeyboardSettingsSchema.parse({ keyRepeat: value });
        expect(result.keyRepeat).toBe(value);
      }
    });

    it('should accept valid capsLock values', () => {
      const values = ['capslock', 'escape', 'control', 'off'];
      for (const value of values) {
        const result = KeyboardSettingsSchema.parse({ capsLock: value });
        expect(result.capsLock).toBe(value);
      }
    });
  });

  describe('TrackpadSettingsSchema', () => {
    it('should accept boolean settings', () => {
      const result = TrackpadSettingsSchema.parse({
        tapToClick: true,
        naturalScroll: false,
        threeFingerDrag: true,
      });
      expect(result.tapToClick).toBe(true);
      expect(result.naturalScroll).toBe(false);
    });

    it('should accept secondaryClick enum values', () => {
      const values = ['two-finger', 'click-corner-right', 'click-corner-left'];
      for (const value of values) {
        const result = TrackpadSettingsSchema.parse({ secondaryClick: value });
        expect(result.secondaryClick).toBe(value);
      }
    });
  });

  describe('MouseSettingsSchema', () => {
    it('should accept valid settings', () => {
      const result = MouseSettingsSchema.parse({
        naturalScroll: true,
        trackingSpeed: 'fast',
        secondaryClick: true,
      });
      expect(result.naturalScroll).toBe(true);
      expect(result.trackingSpeed).toBe('fast');
    });
  });

  describe('RunCommandSchema', () => {
    it('should accept cmd only', () => {
      const result = RunCommandSchema.parse({ cmd: 'echo hello' });
      expect(result.cmd).toBe('echo hello');
    });

    it('should accept cmd with when condition', () => {
      const result = RunCommandSchema.parse({
        cmd: 'brew update',
        when: 'darwin',
      });
      expect(result.cmd).toBe('brew update');
      expect(result.when).toBe('darwin');
    });
  });

  describe('RunHooksSchema', () => {
    it('should accept string commands', () => {
      const result = RunHooksSchema.parse({
        pre: ['echo starting'],
        post: ['echo done'],
      });
      expect(result.pre).toEqual(['echo starting']);
      expect(result.post).toEqual(['echo done']);
    });

    it('should accept mixed string and object commands', () => {
      const result = RunHooksSchema.parse({
        pre: ['echo hello', { cmd: 'brew update', when: 'darwin' }],
      });
      expect(result.pre).toHaveLength(2);
    });
  });

  describe('DottyfileSchema', () => {
    it('should parse minimal config', () => {
      const result = DottyfileSchema.parse({});
      expect(result.version).toBe(1);
      expect(result.providers).toEqual(['homebrew', 'mas']);
      expect(result.apps).toEqual([]);
    });

    it('should parse complete config', () => {
      const result = DottyfileSchema.parse({
        version: 1,
        providers: ['homebrew', 'mas'],
        defaults: {
          mode: 'apply',
          confirm: false,
        },
        profiles: {
          active: ['base', 'work'],
        },
        apps: [
          {
            id: 'git',
            name: 'Git',
            homebrew: { formula: 'git' },
          },
        ],
        dock: {
          autohide: true,
        },
        run: {
          pre: ['echo starting'],
        },
      });
      expect(result.version).toBe(1);
      expect(result.apps).toHaveLength(1);
      expect(result.dock?.autohide).toBe(true);
      expect(result.run?.pre).toHaveLength(1);
    });
  });
});
