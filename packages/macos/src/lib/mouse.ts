import { exec } from '@dottyfiles/core';
import type { MouseSettings } from '@dottyfiles/config';
import type { ApplyResult, MacosApplyOptions } from './types.js';

/**
 * Tracking speed mappings
 * Value is a float from 0 to 3 (com.apple.mouse.scaling)
 */
const TRACKING_SPEED_MAP: Record<string, number> = {
  'slow': 0.5,
  'medium': 1.5,
  'fast': 3.0,
};

/**
 * Double click speed mappings
 * Value is in seconds (NSGlobalDomain com.apple.mouse.doubleClickThreshold)
 */
const DOUBLE_CLICK_SPEED_MAP: Record<string, number> = {
  'slow': 1.5,
  'medium': 0.8,
  'fast': 0.4,
};

/**
 * Apply mouse settings
 */
export async function applyMouseSettings(
  settings: MouseSettings,
  options?: MacosApplyOptions
): Promise<ApplyResult> {
  const changes: string[] = [];

  try {
    // Natural scrolling (same setting as trackpad for consistency)
    if (settings.naturalScroll !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'com.apple.swipescrolldirection',
          '-bool',
          settings.naturalScroll ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`naturalScroll: ${settings.naturalScroll}`);
    }

    // Tracking speed
    if (settings.trackingSpeed !== undefined) {
      const value = TRACKING_SPEED_MAP[settings.trackingSpeed];
      if (value !== undefined && !options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'com.apple.mouse.scaling',
          '-float',
          String(value),
        ], { silent: true });
      }
      changes.push(`trackingSpeed: ${settings.trackingSpeed}`);
    }

    // Double click speed
    if (settings.doubleClickSpeed !== undefined) {
      const value = DOUBLE_CLICK_SPEED_MAP[settings.doubleClickSpeed];
      if (value !== undefined && !options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'com.apple.mouse.doubleClickThreshold',
          '-float',
          String(value),
        ], { silent: true });
      }
      changes.push(`doubleClickSpeed: ${settings.doubleClickSpeed}`);
    }

    // Secondary click (right-click)
    if (settings.secondaryClick !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchMouse',
          'MouseButtonMode',
          settings.secondaryClick ? 'TwoButton' : 'OneButton',
        ], { silent: true });

        // Also for Bluetooth mouse
        await exec('defaults', [
          'write',
          'com.apple.driver.AppleBluetoothMultitouch.mouse',
          'MouseButtonMode',
          settings.secondaryClick ? 'TwoButton' : 'OneButton',
        ], { silent: true });
      }
      changes.push(`secondaryClick: ${settings.secondaryClick}`);
    }

    return {
      success: true,
      changed: changes.length > 0,
    };
  } catch (error) {
    return {
      success: false,
      changed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
