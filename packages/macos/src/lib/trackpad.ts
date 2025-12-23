import { exec } from '@dotty/core';
import type { TrackpadSettings } from '@dotty/config';
import type { ApplyResult, MacosApplyOptions } from './types.js';

/**
 * Secondary click mode values for TrackpadRightClick
 */
const SECONDARY_CLICK_MAP: Record<string, number> = {
  'two-finger': 1,
  'click-corner-right': 2,
  'click-corner-left': 3,
};

/**
 * Apply trackpad settings
 */
export async function applyTrackpadSettings(
  settings: TrackpadSettings,
  options?: MacosApplyOptions
): Promise<ApplyResult> {
  const changes: string[] = [];

  try {
    // Tap to click
    if (settings.tapToClick !== undefined) {
      if (!options?.dryRun) {
        // Enable tap to click for trackpad
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'Clicking',
          '-bool',
          settings.tapToClick ? 'true' : 'false',
        ], { silent: true });

        // Also for Bluetooth trackpad
        await exec('defaults', [
          'write',
          'com.apple.driver.AppleBluetoothMultitouch.trackpad',
          'Clicking',
          '-bool',
          settings.tapToClick ? 'true' : 'false',
        ], { silent: true });

        // Enable for login screen
        await exec('defaults', [
          '-currentHost',
          'write',
          'NSGlobalDomain',
          'com.apple.mouse.tapBehavior',
          '-int',
          settings.tapToClick ? '1' : '0',
        ], { silent: true });
      }
      changes.push(`tapToClick: ${settings.tapToClick}`);
    }

    // Natural scrolling
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

    // Secondary click (right-click)
    if (settings.secondaryClick !== undefined) {
      const value = SECONDARY_CLICK_MAP[settings.secondaryClick];
      if (value !== undefined && !options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'TrackpadRightClick',
          '-bool',
          'true',
        ], { silent: true });

        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'TrackpadCornerSecondaryClick',
          '-int',
          settings.secondaryClick === 'two-finger' ? '0' : String(value),
        ], { silent: true });
      }
      changes.push(`secondaryClick: ${settings.secondaryClick}`);
    }

    // Three finger drag
    if (settings.threeFingerDrag !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'TrackpadThreeFingerDrag',
          '-bool',
          settings.threeFingerDrag ? 'true' : 'false',
        ], { silent: true });

        await exec('defaults', [
          'write',
          'com.apple.driver.AppleBluetoothMultitouch.trackpad',
          'TrackpadThreeFingerDrag',
          '-bool',
          settings.threeFingerDrag ? 'true' : 'false',
        ], { silent: true });

        // Also need to enable in Accessibility
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'Dragging',
          '-bool',
          settings.threeFingerDrag ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`threeFingerDrag: ${settings.threeFingerDrag}`);
    }

    // Swipe between pages (two finger horizontal)
    if (settings.swipeBetweenPages !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'AppleEnableSwipeNavigateWithScrolls',
          '-bool',
          settings.swipeBetweenPages ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`swipeBetweenPages: ${settings.swipeBetweenPages}`);
    }

    // Swipe between full-screen apps (three/four finger horizontal)
    if (settings.swipeBetweenFullScreenApps !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'TrackpadThreeFingerHorizSwipeGesture',
          '-int',
          settings.swipeBetweenFullScreenApps ? '2' : '0',
        ], { silent: true });
      }
      changes.push(`swipeBetweenFullScreenApps: ${settings.swipeBetweenFullScreenApps}`);
    }

    // Mission Control (three/four finger swipe up)
    if (settings.missionControl !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'com.apple.AppleMultitouchTrackpad',
          'TrackpadThreeFingerVertSwipeGesture',
          '-int',
          settings.missionControl ? '2' : '0',
        ], { silent: true });
      }
      changes.push(`missionControl: ${settings.missionControl}`);
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
