import { Command } from 'commander';
import {
  showIntro,
  showOutro,
  log,
  confirm,
  select,
  text,
  exec,
  execStream,
} from '@dotty/core';
import {
  getDottyDir,
  getDottyfilePath,
  dottyDirExists,
  dottyfileExists,
  createDefaultDottyfile,
  writeDottyfile,
  ensureDottyDir,
  type Dottyfile,
} from '@dotty/config';
import {
  ensureDottyPackageJson,
  ensureDottyGitignore,
  PROVIDER_PACKAGES,
} from '@dotty/runtime';

const VERSION = '0.1.0';

type SetupMode = 'fresh' | 'clone';
type DotfileManager = 'chezmoi' | 'dotty-native';

interface InitOptions {
  yes?: boolean;
}

async function cloneFromGitHub(repoUrl: string): Promise<boolean> {
  const dottyDir = getDottyDir();

  log.step(`Cloning ${repoUrl} to ${dottyDir}...`);

  const result = await exec('git', ['clone', repoUrl, dottyDir]);
  return result.exitCode === 0;
}

async function initGitRepo(): Promise<boolean> {
  const dottyDir = getDottyDir();

  const result = await exec('git', ['init'], { cwd: dottyDir });
  return result.exitCode === 0;
}

async function installProviders(providers: string[]): Promise<boolean> {
  const dottyDir = getDottyDir();

  const packages = providers
    .map(name => PROVIDER_PACKAGES[name])
    .filter(Boolean)
    .map(pkg => `${pkg}@${VERSION}`);

  if (packages.length === 0) {
    return true;
  }

  log.step('Installing provider packages...');

  const exitCode = await execStream('npm', ['install', ...packages], {
    cwd: dottyDir,
  });

  return exitCode === 0;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize dotty configuration')
    .option('--clone <url>', 'Clone from a GitHub repository')
    .action(async (options: { clone?: string } & InitOptions) => {
      showIntro('dotty');

      const globalOpts = program.opts<InitOptions>();
      const skipPrompts = globalOpts.yes || false;

      // Check if .dotty already exists
      const exists = await dottyDirExists();
      const hasConfig = await dottyfileExists();

      if (exists && hasConfig) {
        log.info(`Found existing configuration at ${getDottyDir()}`);

        if (!skipPrompts) {
          const proceed = await confirm(
            'A Dottyfile already exists. Do you want to reinitialize?',
            false
          );
          if (!proceed) {
            showOutro('Cancelled.');
            return;
          }
        }
      }

      // Determine setup mode
      let mode: SetupMode = 'fresh';
      let repoUrl: string | undefined = options.clone;

      if (!exists && !repoUrl && !skipPrompts) {
        mode = await select<SetupMode>('How would you like to set up dotty?', [
          { value: 'fresh', label: 'Start fresh', hint: 'Create a new dotfiles configuration' },
          { value: 'clone', label: 'Clone from GitHub', hint: 'Use an existing dotfiles repo' },
        ]);

        if (mode === 'clone') {
          repoUrl = await text(
            'Enter the GitHub repository URL:',
            'https://github.com/username/dotfiles'
          );
        }
      }

      // Clone or create directory
      if (mode === 'clone' && repoUrl) {
        const success = await cloneFromGitHub(repoUrl);
        if (!success) {
          log.error('Failed to clone repository.');
          showOutro();
          return;
        }
      } else if (!exists) {
        await ensureDottyDir();
        await initGitRepo();
      }

      // Check if Dottyfile exists after clone
      if (await dottyfileExists()) {
        log.success('Found existing Dottyfile!');
        log.info('Installing providers...');

        // TODO: Read existing config and install providers
        showOutro('Initialization complete!');
        return;
      }

      // Gather preferences
      let dotfileManager: DotfileManager = 'chezmoi';
      let providers: string[] = ['homebrew', 'mas'];

      if (!skipPrompts) {
        dotfileManager = await select<DotfileManager>('Which dotfile manager do you want to use?', [
          { value: 'chezmoi', label: 'Chezmoi', hint: 'Powerful, feature-rich (recommended)' },
          { value: 'dotty-native', label: 'Dotty Native', hint: 'Coming soon...' },
        ]);

        if (dotfileManager === 'dotty-native') {
          log.warn('Dotty Native is not yet implemented. Using Chezmoi for now.');
          dotfileManager = 'chezmoi';
        }

        const providerSelection = await select<string>('Which package managers do you use?', [
          { value: 'homebrew,mas', label: 'Homebrew + Mac App Store', hint: 'Full macOS setup' },
          { value: 'homebrew', label: 'Homebrew only', hint: 'Just Homebrew' },
          { value: 'mas', label: 'Mac App Store only', hint: 'Just MAS' },
        ]);

        providers = providerSelection.split(',');
      }

      // Create Dottyfile
      log.step('Creating Dottyfile...');

      const config: Dottyfile = {
        ...createDefaultDottyfile(),
        providers,
        defaults: {
          mode: 'apply',
          confirm: true,
          destructive: 'prompt',
        },
        profiles: {
          active: ['base'],
        },
      };

      await writeDottyfile(config);
      log.success(`Created ${getDottyfilePath()}`);

      // Create package.json
      log.step('Creating package.json...');
      await ensureDottyPackageJson(VERSION);

      // Create .gitignore
      await ensureDottyGitignore();

      // Install providers
      const installed = await installProviders(providers);
      if (!installed) {
        log.warn('Failed to install some providers. Run `npm install` manually.');
      } else {
        log.success('Providers installed!');
      }

      // Summary
      console.log();
      log.info(`Configuration created at: ${getDottyDir()}`);
      log.info(`Dotfile manager: ${dotfileManager}`);
      log.info(`Providers: ${providers.join(', ')}`);

      console.log();
      log.step('Next steps:');
      console.log('  1. Add apps to your Dottyfile');
      console.log('  2. Run `dotty apply` to install them');
      console.log('  3. Commit and push your ~/.dotty folder');

      showOutro('Initialization complete!');
    });
}
