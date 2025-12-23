import { Command } from 'commander';
import chalk from 'chalk';
import { showIntro, showOutro, log } from '@dotty/core';
import {
  loadDottyfile,
  dottyfileExists,
  getDottyfilePath,
  writeDottyfile,
  getAllProfileNames,
  getProfileDefinition,
  getEffectiveProfiles,
  getAutoActivatedProfiles,
  getHostname,
  setActiveProfiles,
  addActiveProfile,
  removeActiveProfile,
} from '@dotty/config';
import type { GlobalOptions } from '@dotty/core';

export function registerProfileCommand(program: Command): void {
  const profileCmd = program
    .command('profile')
    .description('Manage profiles');

  // Default action - list profiles
  profileCmd.action(async () => {
    await listProfiles(program);
  });

  // Subcommand: profile list
  profileCmd
    .command('list')
    .description('List all profiles')
    .action(async () => {
      await listProfiles(program);
    });

  // Subcommand: profile switch <profiles...>
  profileCmd
    .command('switch <profiles...>')
    .description('Set active profiles (replaces current)')
    .action(async (profiles: string[]) => {
      const opts = program.opts<GlobalOptions>();
      showIntro('dotty');

      if (!(await dottyfileExists())) {
        log.error(`No Dottyfile found at ${getDottyfilePath()}`);
        showOutro();
        return;
      }

      const config = await loadDottyfile();
      const allProfiles = getAllProfileNames(config);

      // Validate profiles exist
      const invalid = profiles.filter(p => !allProfiles.includes(p));
      if (invalid.length > 0) {
        log.warn(`Unknown profile(s): ${invalid.join(', ')}`);
        log.info(`Available: ${allProfiles.join(', ')}`);
      }

      const valid = profiles.filter(p => allProfiles.includes(p));
      if (valid.length === 0) {
        log.error('No valid profiles specified');
        showOutro();
        return;
      }

      if (opts.dryRun) {
        log.info(`[DRY RUN] Would set active profiles to: ${valid.join(', ')}`);
        showOutro();
        return;
      }

      const updated = setActiveProfiles(config, valid);
      await writeDottyfile(updated);

      log.success(`Active profiles: ${valid.join(', ')}`);
      showOutro();
    });

  // Subcommand: profile add <profile>
  profileCmd
    .command('add <profile>')
    .description('Add a profile to active list')
    .action(async (profile: string) => {
      const opts = program.opts<GlobalOptions>();
      showIntro('dotty');

      if (!(await dottyfileExists())) {
        log.error(`No Dottyfile found at ${getDottyfilePath()}`);
        showOutro();
        return;
      }

      const config = await loadDottyfile();
      const current = config.profiles?.active || ['base'];

      if (current.includes(profile)) {
        log.info(`Profile '${profile}' is already active`);
        showOutro();
        return;
      }

      if (opts.dryRun) {
        log.info(`[DRY RUN] Would add '${profile}' to active profiles`);
        showOutro();
        return;
      }

      const updated = addActiveProfile(config, profile);
      await writeDottyfile(updated);

      log.success(`Added '${profile}' to active profiles`);
      log.info(`Active: ${updated.profiles?.active?.join(', ')}`);
      showOutro();
    });

  // Subcommand: profile remove <profile>
  profileCmd
    .command('remove <profile>')
    .description('Remove a profile from active list')
    .action(async (profile: string) => {
      const opts = program.opts<GlobalOptions>();
      showIntro('dotty');

      if (!(await dottyfileExists())) {
        log.error(`No Dottyfile found at ${getDottyfilePath()}`);
        showOutro();
        return;
      }

      const config = await loadDottyfile();
      const current = config.profiles?.active || ['base'];

      if (!current.includes(profile)) {
        log.info(`Profile '${profile}' is not active`);
        showOutro();
        return;
      }

      if (opts.dryRun) {
        log.info(`[DRY RUN] Would remove '${profile}' from active profiles`);
        showOutro();
        return;
      }

      const updated = removeActiveProfile(config, profile);
      await writeDottyfile(updated);

      log.success(`Removed '${profile}' from active profiles`);
      log.info(`Active: ${updated.profiles?.active?.join(', ')}`);
      showOutro();
    });
}

async function listProfiles(program: Command): Promise<void> {
  showIntro('dotty');

  if (!(await dottyfileExists())) {
    log.error(`No Dottyfile found at ${getDottyfilePath()}`);
    showOutro();
    return;
  }

  const config = await loadDottyfile();
  const allProfiles = getAllProfileNames(config);
  const activeProfiles = config.profiles?.active || ['base'];
  const effectiveProfiles = getEffectiveProfiles(config);
  const autoActivated = getAutoActivatedProfiles(config);
  const hostname = getHostname();

  console.log();
  console.log(`  ${chalk.bold('Hostname:')} ${hostname}`);
  console.log();
  console.log(`  ${chalk.bold('Profiles:')}`);
  console.log();

  for (const name of allProfiles) {
    const isActive = activeProfiles.includes(name);
    const isEffective = effectiveProfiles.includes(name);
    const isAuto = autoActivated.includes(name);
    const def = getProfileDefinition(config, name);

    let status = '';
    if (isActive) {
      status = chalk.green(' (active)');
    } else if (isAuto) {
      status = chalk.cyan(' (auto)');
    } else if (isEffective) {
      status = chalk.dim(' (inherited)');
    }

    const icon = isEffective ? chalk.green('●') : chalk.dim('○');
    console.log(`    ${icon} ${name}${status}`);

    // Show profile details
    if (def) {
      if (def.extends) {
        console.log(`      ${chalk.dim(`extends: ${def.extends}`)}`);
      }
      if (def.hostname) {
        const hostnames = Array.isArray(def.hostname) ? def.hostname : [def.hostname];
        console.log(`      ${chalk.dim(`hostname: ${hostnames.join(', ')}`)}`);
      }
      if (def.dock || def.keyboard || def.trackpad || def.mouse) {
        const settings: string[] = [];
        if (def.dock) settings.push('dock');
        if (def.keyboard) settings.push('keyboard');
        if (def.trackpad) settings.push('trackpad');
        if (def.mouse) settings.push('mouse');
        console.log(`      ${chalk.dim(`settings: ${settings.join(', ')}`)}`);
      }
    }
  }

  console.log();
  console.log(`  ${chalk.bold('Effective:')} ${effectiveProfiles.join(', ')}`);

  showOutro();
}
