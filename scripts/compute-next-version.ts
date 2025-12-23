#!/usr/bin/env tsx
import { execSync } from 'child_process';
import * as semver from 'semver';

// Check if origin/main exists
function hasOriginMain(): boolean {
  try {
    execSync('git rev-parse origin/main', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get the ref to analyze commits from
function getMainRef(): string {
  return hasOriginMain() ? 'origin/main' : 'HEAD';
}

// Get latest tag from main
function getLatestTag(): string | null {
  try {
    const ref = getMainRef();
    const tag = execSync(`git describe --tags --abbrev=0 ${ref} 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();
    return tag || null;
  } catch {
    return null;
  }
}

// Analyze commits for bump type
function analyzeBump(fromRef: string): 'major' | 'minor' | 'patch' {
  const mainRef = getMainRef();
  const range = fromRef ? `${fromRef}..${mainRef}` : mainRef;
  const log = execSync(`git log ${range} --format=%s%n%b`, { encoding: 'utf-8' });

  if (/BREAKING CHANGE:|^.*!:/.test(log)) return 'major';
  if (/^feat(\(.*\))?:/m.test(log)) return 'minor';
  return 'patch';
}

// Get proposed version from release/next if it exists
function getProposedVersion(): string | null {
  try {
    execSync('git fetch origin release/next', { stdio: 'ignore' });
    const pkg = execSync('git show origin/release/next:package.json', { encoding: 'utf-8' });
    return JSON.parse(pkg).version || null;
  } catch {
    return null;
  }
}

// Main
const latestTag = getLatestTag();
const currentVersion = latestTag ? latestTag.replace(/^v/, '') : '0.0.0';
const bump = analyzeBump(latestTag || '');
const bumpedVersion = semver.inc(currentVersion, bump)!;
const proposedVersion = getProposedVersion();

// Monotonic: take max
let finalVersion = bumpedVersion;
if (proposedVersion && semver.gt(proposedVersion, bumpedVersion)) {
  finalVersion = proposedVersion;
}

// Output for GitHub Actions
console.log(`version=${finalVersion}`);
console.log(`bump=${bump}`);
console.log(`previous=${currentVersion}`);
