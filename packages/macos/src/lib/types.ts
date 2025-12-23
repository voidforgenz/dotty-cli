import type {
  DockSettings,
  KeyboardSettings,
  TrackpadSettings,
  MouseSettings,
} from '@dotty/config';

export interface ApplyResult {
  success: boolean;
  changed: boolean;
  error?: string;
}

export interface MacosApplyOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface MacosSettings {
  dock?: DockSettings;
  keyboard?: KeyboardSettings;
  trackpad?: TrackpadSettings;
  mouse?: MouseSettings;
}
