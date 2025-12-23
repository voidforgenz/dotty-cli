import { z } from 'zod';

// App installation sources
export const HomebrewAppSchema = z.object({
  formula: z.string().optional(),
  cask: z.string().optional(),
}).refine(data => data.formula || data.cask, {
  message: 'Either formula or cask must be specified',
});

export const MasAppSchema = z.object({
  id: z.number(),
});

// Single app entry
export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  profiles: z.array(z.string()).optional(),
  installer: z.string().optional(),
  homebrew: HomebrewAppSchema.optional(),
  mas: MasAppSchema.optional(),
});

// Defaults section
export const DefaultsSchema = z.object({
  mode: z.enum(['apply', 'pull', 'push']).default('apply'),
  confirm: z.boolean().default(true),
  destructive: z.enum(['never', 'prompt', 'always']).default('prompt'),
});

// Homebrew provider settings
export const HomebrewSettingsSchema = z.object({
  cleanup: z.boolean().optional(),
  taps: z.array(z.string()).optional(),
});

// MAS provider settings
export const MasSettingsSchema = z.object({
  signInRequired: z.boolean().optional(),
});

// Dock settings
export const DockSettingsSchema = z.object({
  autohide: z.boolean().optional(),
  showRecents: z.boolean().optional(),
  iconSize: z.number().optional(),
  apps: z.array(z.string()).optional(),
  folders: z.array(z.string()).optional(),
  foldersDisplay: z.enum(['folder', 'stack']).optional(),
  foldersView: z.enum(['fan', 'grid', 'list', 'automatic']).optional(),
});

// Keyboard settings
export const KeyboardSettingsSchema = z.object({
  keyRepeat: z.enum(['off', 'slow', 'medium', 'fast', 'very-fast']).optional(),
  delayUntilRepeat: z.enum(['long', 'medium', 'short']).optional(),
  useFnAsStandard: z.boolean().optional(),
  capsLock: z.enum(['capslock', 'escape', 'control', 'off']).optional(),
});

// Trackpad settings
export const TrackpadSettingsSchema = z.object({
  tapToClick: z.boolean().optional(),
  naturalScroll: z.boolean().optional(),
  secondaryClick: z.enum(['two-finger', 'click-corner-right', 'click-corner-left']).optional(),
  threeFingerDrag: z.boolean().optional(),
  swipeBetweenPages: z.boolean().optional(),
  swipeBetweenFullScreenApps: z.boolean().optional(),
  missionControl: z.boolean().optional(),
});

// Mouse settings
export const MouseSettingsSchema = z.object({
  naturalScroll: z.boolean().optional(),
  trackingSpeed: z.enum(['slow', 'medium', 'fast']).optional(),
  doubleClickSpeed: z.enum(['slow', 'medium', 'fast']).optional(),
  secondaryClick: z.boolean().optional(),
});

// Individual profile definition (for named profiles like [profiles.work])
export const ProfileDefinitionSchema = z.object({
  extends: z.string().optional(),
  hostname: z.union([z.string(), z.array(z.string())]).optional(),
  // Profile-specific system settings
  dock: DockSettingsSchema.optional(),
  keyboard: KeyboardSettingsSchema.optional(),
  trackpad: TrackpadSettingsSchema.optional(),
  mouse: MouseSettingsSchema.optional(),
});

// Profiles section - allows 'active' array plus named profile definitions
export const ProfilesSchema = z.object({
  active: z.array(z.string()).default(['base']),
}).passthrough();

// Run hooks
export const RunCommandSchema = z.object({
  cmd: z.string(),
  when: z.string().optional(),
});

export const RunHooksSchema = z.object({
  pre: z.array(z.union([z.string(), RunCommandSchema])).optional(),
  post: z.array(z.union([z.string(), RunCommandSchema])).optional(),
});

// Complete Dottyfile schema
export const DottyfileSchema = z.object({
  version: z.number().default(1),
  providers: z.array(z.string()).default(['homebrew', 'mas']),
  defaults: DefaultsSchema.optional(),
  profiles: ProfilesSchema.optional(),
  apps: z.array(AppSchema).default([]),
  homebrew: HomebrewSettingsSchema.optional(),
  mas: MasSettingsSchema.optional(),
  dock: DockSettingsSchema.optional(),
  keyboard: KeyboardSettingsSchema.optional(),
  trackpad: TrackpadSettingsSchema.optional(),
  mouse: MouseSettingsSchema.optional(),
  run: RunHooksSchema.optional(),
});

// Type exports
export type HomebrewApp = z.infer<typeof HomebrewAppSchema>;
export type MasApp = z.infer<typeof MasAppSchema>;
export type App = z.infer<typeof AppSchema>;
export type Defaults = z.infer<typeof DefaultsSchema>;
export type Profiles = z.infer<typeof ProfilesSchema>;
export type ProfileDefinition = z.infer<typeof ProfileDefinitionSchema>;
export type HomebrewSettings = z.infer<typeof HomebrewSettingsSchema>;
export type MasSettings = z.infer<typeof MasSettingsSchema>;
export type DockSettings = z.infer<typeof DockSettingsSchema>;
export type KeyboardSettings = z.infer<typeof KeyboardSettingsSchema>;
export type TrackpadSettings = z.infer<typeof TrackpadSettingsSchema>;
export type MouseSettings = z.infer<typeof MouseSettingsSchema>;
export type RunCommand = z.infer<typeof RunCommandSchema>;
export type RunHooks = z.infer<typeof RunHooksSchema>;
export type Dottyfile = z.infer<typeof DottyfileSchema>;
