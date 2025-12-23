// Schema and types
export * from './lib/schema.js';

// Parser
export {
  DOTTYFILE_NAME,
  DOTTY_DIR,
  getDottyDir,
  getDottyfilePath,
  dottyfileExists,
  dottyDirExists,
  parseDottyfileString,
  loadDottyfile,
  loadDottyfileSafe,
  tryParseDottyfile,
  type ParseResult,
} from './lib/parser.js';

// Writer
export {
  stringifyDottyfile,
  writeDottyfile,
  ensureDottyDir,
  createDefaultDottyfile,
  addApp,
  removeApp,
  getActiveApps,
  dedupeApps,
} from './lib/writer.js';

// Profiles
export {
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
  type ProfileSettings,
} from './lib/profiles.js';
