export interface GlobalOptions {
  yes?: boolean;
  dryRun?: boolean;
}

export interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  version?: string;
}

export interface AppInfo {
  name: string;
  path: string;
  caskName?: string;
  masInfo?: { name: string; id: string };
}

export interface BrewfileContents {
  taps: string[];
  brews: string[];
  casks: string[];
  mas: { name: string; id: string }[];
}
