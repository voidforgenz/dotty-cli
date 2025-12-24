import {
  resolveAppProvider,
  resolveAllApps,
  groupByProvider,
  findMissingApps,
  findExtraApps,
  installMissingApps,
  type ResolvedApp,
} from './resolver.js';
import type { App, Dottyfile } from '@dottyfiles/config';
import type { Provider } from './types.js';

// Mock provider factory
function createMockProvider(
  name: string,
  options?: {
    isInstalled?: boolean;
    installSuccess?: boolean;
    installedApps?: { id: string; name: string }[];
  }
): Provider {
  return {
    name,
    isAvailable: jest.fn().mockResolvedValue(true),
    getVersion: jest.fn().mockResolvedValue('1.0.0'),
    getInstalled: jest.fn().mockResolvedValue(options?.installedApps ?? []),
    isInstalled: jest.fn().mockResolvedValue(options?.isInstalled ?? false),
    install: jest.fn().mockResolvedValue({
      success: options?.installSuccess ?? true,
      error: options?.installSuccess === false ? 'Install failed' : undefined,
    }),
    uninstall: jest.fn().mockResolvedValue({ success: true }),
  };
}

describe('Resolver', () => {
  describe('resolveAppProvider', () => {
    it('should return null for app with no provider info', async () => {
      const app: App = { id: 'test', name: 'Test App' };
      const providers = new Map<string, Provider>();
      providers.set('homebrew', createMockProvider('homebrew'));

      const result = await resolveAppProvider(app, ['homebrew'], providers);
      expect(result).toBeNull();
    });

    it('should resolve homebrew app', async () => {
      const app: App = {
        id: 'git',
        name: 'Git',
        homebrew: { formula: 'git' },
      };
      const homebrewProvider = createMockProvider('homebrew');
      const providers = new Map<string, Provider>();
      providers.set('homebrew', homebrewProvider);

      const result = await resolveAppProvider(app, ['homebrew'], providers);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe('homebrew');
      expect(result?.provider).toBe(homebrewProvider);
    });

    it('should resolve mas app', async () => {
      const app: App = {
        id: 'xcode',
        name: 'Xcode',
        mas: { id: 497799835 },
      };
      const masProvider = createMockProvider('mas');
      const providers = new Map<string, Provider>();
      providers.set('mas', masProvider);

      const result = await resolveAppProvider(app, ['mas'], providers);
      expect(result).not.toBeNull();
      expect(result?.providerName).toBe('mas');
    });

    it('should use explicit installer when specified', async () => {
      const app: App = {
        id: 'custom',
        name: 'Custom App',
        installer: 'custom-provider',
      };
      const customProvider = createMockProvider('custom-provider');
      const providers = new Map<string, Provider>();
      providers.set('homebrew', createMockProvider('homebrew'));
      providers.set('custom-provider', customProvider);

      const result = await resolveAppProvider(app, ['homebrew'], providers);
      expect(result?.providerName).toBe('custom-provider');
    });

    it('should return null for unknown installer', async () => {
      const app: App = {
        id: 'custom',
        name: 'Custom App',
        installer: 'nonexistent',
      };
      const providers = new Map<string, Provider>();
      providers.set('homebrew', createMockProvider('homebrew'));

      const result = await resolveAppProvider(app, ['homebrew'], providers);
      expect(result).toBeNull();
    });

    it('should respect provider order', async () => {
      const app: App = {
        id: 'app',
        name: 'App',
        homebrew: { formula: 'app' },
        mas: { id: 123 },
      };
      const homebrewProvider = createMockProvider('homebrew');
      const masProvider = createMockProvider('mas');
      const providers = new Map<string, Provider>();
      providers.set('homebrew', homebrewProvider);
      providers.set('mas', masProvider);

      // Homebrew first
      let result = await resolveAppProvider(app, ['homebrew', 'mas'], providers);
      expect(result?.providerName).toBe('homebrew');

      // MAS first
      result = await resolveAppProvider(app, ['mas', 'homebrew'], providers);
      expect(result?.providerName).toBe('mas');
    });
  });

  describe('resolveAllApps', () => {
    it('should resolve multiple apps', async () => {
      const apps: App[] = [
        { id: 'git', name: 'Git', homebrew: { formula: 'git' } },
        { id: 'xcode', name: 'Xcode', mas: { id: 497799835 } },
        { id: 'unknown', name: 'Unknown' },
      ];
      const providers = new Map<string, Provider>();
      providers.set('homebrew', createMockProvider('homebrew'));
      providers.set('mas', createMockProvider('mas'));

      const { resolved, unresolved } = await resolveAllApps(
        apps,
        ['homebrew', 'mas'],
        providers
      );

      expect(resolved).toHaveLength(2);
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].id).toBe('unknown');
    });
  });

  describe('groupByProvider', () => {
    it('should group resolved apps by provider', () => {
      const homebrewProvider = createMockProvider('homebrew');
      const masProvider = createMockProvider('mas');

      const resolved: ResolvedApp[] = [
        {
          app: { id: 'git', name: 'Git', homebrew: { formula: 'git' } },
          providerName: 'homebrew',
          provider: homebrewProvider,
        },
        {
          app: { id: 'node', name: 'Node', homebrew: { formula: 'node' } },
          providerName: 'homebrew',
          provider: homebrewProvider,
        },
        {
          app: { id: 'xcode', name: 'Xcode', mas: { id: 123 } },
          providerName: 'mas',
          provider: masProvider,
        },
      ];

      const groups = groupByProvider(resolved);

      expect(groups.get('homebrew')).toHaveLength(2);
      expect(groups.get('mas')).toHaveLength(1);
    });

    it('should return empty map for empty input', () => {
      const groups = groupByProvider([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('findMissingApps', () => {
    it('should find apps not installed', async () => {
      const installedProvider = createMockProvider('homebrew', { isInstalled: true });
      const notInstalledProvider = createMockProvider('mas', { isInstalled: false });

      const resolved: ResolvedApp[] = [
        {
          app: { id: 'installed', name: 'Installed', homebrew: { formula: 'x' } },
          providerName: 'homebrew',
          provider: installedProvider,
        },
        {
          app: { id: 'missing', name: 'Missing', mas: { id: 123 } },
          providerName: 'mas',
          provider: notInstalledProvider,
        },
      ];

      const missing = await findMissingApps(resolved);

      expect(missing).toHaveLength(1);
      expect(missing[0].app.id).toBe('missing');
    });
  });

  describe('findExtraApps', () => {
    it('should find apps installed but not in config', async () => {
      const homebrewProvider = createMockProvider('homebrew', {
        installedApps: [
          { id: 'git', name: 'Git' },
          { id: 'extra', name: 'Extra App' },
        ],
      });

      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [{ id: 'git', name: 'Git' }],
      };

      const providers = new Map<string, Provider>();
      providers.set('homebrew', homebrewProvider);

      const extras = await findExtraApps(config, providers);

      expect(extras).toHaveLength(1);
      expect(extras[0].providerName).toBe('homebrew');
      expect(extras[0].apps).toHaveLength(1);
      expect(extras[0].apps[0].id).toBe('extra');
    });

    it('should return empty when all apps in config', async () => {
      const homebrewProvider = createMockProvider('homebrew', {
        installedApps: [{ id: 'git', name: 'Git' }],
      });

      const config: Dottyfile = {
        version: 1,
        providers: ['homebrew'],
        apps: [{ id: 'git', name: 'Git' }],
      };

      const providers = new Map<string, Provider>();
      providers.set('homebrew', homebrewProvider);

      const extras = await findExtraApps(config, providers);

      expect(extras).toHaveLength(0);
    });
  });

  describe('installMissingApps', () => {
    it('should install all missing apps', async () => {
      const provider = createMockProvider('homebrew', { installSuccess: true });

      const missing: ResolvedApp[] = [
        {
          app: { id: 'app1', name: 'App 1', homebrew: { formula: 'app1' } },
          providerName: 'homebrew',
          provider,
        },
        {
          app: { id: 'app2', name: 'App 2', homebrew: { formula: 'app2' } },
          providerName: 'homebrew',
          provider,
        },
      ];

      const { success, failed } = await installMissingApps(missing);

      expect(success).toHaveLength(2);
      expect(failed).toHaveLength(0);
      expect(provider.install).toHaveBeenCalledTimes(2);
    });

    it('should track failed installations', async () => {
      const failingProvider = createMockProvider('homebrew', { installSuccess: false });

      const missing: ResolvedApp[] = [
        {
          app: { id: 'failing', name: 'Failing', homebrew: { formula: 'fail' } },
          providerName: 'homebrew',
          provider: failingProvider,
        },
      ];

      const { success, failed } = await installMissingApps(missing);

      expect(success).toHaveLength(0);
      expect(failed).toHaveLength(1);
      expect(failed[0].app.id).toBe('failing');
    });

    it('should call progress callback', async () => {
      const provider = createMockProvider('homebrew', { installSuccess: true });
      const onProgress = jest.fn();

      const missing: ResolvedApp[] = [
        {
          app: { id: 'app1', name: 'App 1', homebrew: { formula: 'app1' } },
          providerName: 'homebrew',
          provider,
        },
      ];

      await installMissingApps(missing, { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'app1' }),
        expect.objectContaining({ success: true })
      );
    });

    it('should pass dryRun option to provider', async () => {
      const provider = createMockProvider('homebrew');

      const missing: ResolvedApp[] = [
        {
          app: { id: 'app1', name: 'App 1', homebrew: { formula: 'app1' } },
          providerName: 'homebrew',
          provider,
        },
      ];

      await installMissingApps(missing, { dryRun: true });

      expect(provider.install).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ dryRun: true })
      );
    });
  });
});
