// Types
export * from './lib/types.js';

// Individual setting modules
export { applyDockSettings, isDockutilAvailable } from './lib/dock.js';
export { applyKeyboardSettings } from './lib/keyboard.js';
export { applyTrackpadSettings } from './lib/trackpad.js';
export { applyMouseSettings } from './lib/mouse.js';

// Re-export for convenience
import { applyDockSettings } from './lib/dock.js';
import { applyKeyboardSettings } from './lib/keyboard.js';
import { applyTrackpadSettings } from './lib/trackpad.js';
import { applyMouseSettings } from './lib/mouse.js';
import type { MacosSettings, MacosApplyOptions, ApplyResult } from './lib/types.js';

export interface MacosApplyResult {
  dock?: ApplyResult;
  keyboard?: ApplyResult;
  trackpad?: ApplyResult;
  mouse?: ApplyResult;
  hasChanges: boolean;
  hasErrors: boolean;
}

/**
 * Apply all macOS settings from a Dottyfile
 */
export async function applyMacosSettings(
  settings: MacosSettings,
  options?: MacosApplyOptions
): Promise<MacosApplyResult> {
  const result: MacosApplyResult = {
    hasChanges: false,
    hasErrors: false,
  };

  if (settings.dock) {
    result.dock = await applyDockSettings(settings.dock, options);
    if (result.dock.changed) result.hasChanges = true;
    if (!result.dock.success) result.hasErrors = true;
  }

  if (settings.keyboard) {
    result.keyboard = await applyKeyboardSettings(settings.keyboard, options);
    if (result.keyboard.changed) result.hasChanges = true;
    if (!result.keyboard.success) result.hasErrors = true;
  }

  if (settings.trackpad) {
    result.trackpad = await applyTrackpadSettings(settings.trackpad, options);
    if (result.trackpad.changed) result.hasChanges = true;
    if (!result.trackpad.success) result.hasErrors = true;
  }

  if (settings.mouse) {
    result.mouse = await applyMouseSettings(settings.mouse, options);
    if (result.mouse.changed) result.hasChanges = true;
    if (!result.mouse.success) result.hasErrors = true;
  }

  return result;
}
