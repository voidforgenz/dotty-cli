import { exec } from '@dottyfiles/core';
import type { KeyboardSettings } from '@dottyfiles/config';
import type { ApplyResult, MacosApplyOptions } from './types.js';

/**
 * Key repeat speed mappings (NSGlobalDomain KeyRepeat)
 * Lower = faster, 2 is fastest system allows in UI
 */
const KEY_REPEAT_MAP: Record<string, number> = {
  'off': 300000,      // Effectively off
  'slow': 6,
  'medium': 4,
  'fast': 2,
  'very-fast': 1,     // Faster than UI allows
};

/**
 * Delay until repeat mappings (NSGlobalDomain InitialKeyRepeat)
 * Lower = shorter delay
 */
const DELAY_MAP: Record<string, number> = {
  'long': 68,
  'medium': 35,
  'short': 15,
};

/**
 * HID usage codes for key remapping
 */
const HID_KEYS = {
  capsLock: 0x700000039,
  escape: 0x700000029,
  control: 0x7000000E0,
  none: 0x0,
};

/**
 * Apply caps lock key remapping via hidutil
 */
async function applyCapsLockMapping(
  mapping: 'capslock' | 'escape' | 'control' | 'off',
  dryRun?: boolean
): Promise<void> {
  let targetKey: number;

  switch (mapping) {
    case 'escape':
      targetKey = HID_KEYS.escape;
      break;
    case 'control':
      targetKey = HID_KEYS.control;
      break;
    case 'off':
      targetKey = HID_KEYS.none;
      break;
    case 'capslock':
    default:
      // Reset to default (remove any remapping)
      if (!dryRun) {
        await exec('hidutil', [
          'property',
          '--set',
          '{"UserKeyMapping":[]}',
        ], { silent: true });
      }
      return;
  }

  if (!dryRun) {
    const mapping = JSON.stringify({
      UserKeyMapping: [
        {
          HIDKeyboardModifierMappingSrc: HID_KEYS.capsLock,
          HIDKeyboardModifierMappingDst: targetKey,
        },
      ],
    });

    await exec('hidutil', ['property', '--set', mapping], { silent: true });
  }
}

/**
 * Create a launch agent to persist caps lock remapping across reboots
 */
async function createCapsLockLaunchAgent(
  mapping: 'capslock' | 'escape' | 'control' | 'off',
  dryRun?: boolean
): Promise<void> {
  if (mapping === 'capslock') {
    // Remove launch agent if resetting to default
    if (!dryRun) {
      const agentPath = `${process.env.HOME}/Library/LaunchAgents/com.dotty.keyboard.plist`;
      await exec('rm', ['-f', agentPath], { silent: true });
    }
    return;
  }

  let targetKey: number;
  switch (mapping) {
    case 'escape':
      targetKey = HID_KEYS.escape;
      break;
    case 'control':
      targetKey = HID_KEYS.control;
      break;
    case 'off':
      targetKey = HID_KEYS.none;
      break;
    default:
      return;
  }

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dotty.keyboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/hidutil</string>
        <string>property</string>
        <string>--set</string>
        <string>{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":${HID_KEYS.capsLock},"HIDKeyboardModifierMappingDst":${targetKey}}]}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;

  if (!dryRun) {
    const agentDir = `${process.env.HOME}/Library/LaunchAgents`;
    const agentPath = `${agentDir}/com.dotty.keyboard.plist`;

    await exec('mkdir', ['-p', agentDir], { silent: true });

    // Write plist file
    const { execSync } = await import('child_process');
    execSync(`cat > "${agentPath}" << 'PLIST'
${plist}
PLIST`);

    // Load the agent
    await exec('launchctl', ['unload', agentPath], { silent: true });
    await exec('launchctl', ['load', agentPath], { silent: true });
  }
}

/**
 * Apply keyboard settings
 */
export async function applyKeyboardSettings(
  settings: KeyboardSettings,
  options?: MacosApplyOptions
): Promise<ApplyResult> {
  const changes: string[] = [];

  try {
    // Key repeat speed
    if (settings.keyRepeat !== undefined) {
      const value = KEY_REPEAT_MAP[settings.keyRepeat];
      if (value !== undefined && !options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'KeyRepeat',
          '-int',
          String(value),
        ], { silent: true });
      }
      changes.push(`KeyRepeat: ${settings.keyRepeat}`);
    }

    // Delay until repeat
    if (settings.delayUntilRepeat !== undefined) {
      const value = DELAY_MAP[settings.delayUntilRepeat];
      if (value !== undefined && !options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'InitialKeyRepeat',
          '-int',
          String(value),
        ], { silent: true });
      }
      changes.push(`InitialKeyRepeat: ${settings.delayUntilRepeat}`);
    }

    // Use Fn keys as standard function keys
    if (settings.useFnAsStandard !== undefined) {
      if (!options?.dryRun) {
        await exec('defaults', [
          'write',
          'NSGlobalDomain',
          'com.apple.keyboard.fnState',
          '-bool',
          settings.useFnAsStandard ? 'true' : 'false',
        ], { silent: true });
      }
      changes.push(`fnState: ${settings.useFnAsStandard}`);
    }

    // Caps lock remapping
    if (settings.capsLock !== undefined) {
      await applyCapsLockMapping(settings.capsLock, options?.dryRun);
      await createCapsLockLaunchAgent(settings.capsLock, options?.dryRun);
      changes.push(`capsLock: ${settings.capsLock}`);
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
