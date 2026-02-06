/**
 * Shared data layer — reads/writes ~/.aidd/hub.json.
 * Same format as the Rust JsonStore in Hub app.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ProjectEntry {
  name: string;
  path: string;
  detected: boolean;
}

export interface HubData {
  projects: ProjectEntry[];
  active_project: string | null;
  framework_version: string | null;
  auto_sync: boolean;
  last_sync_check: string | null;
}

const DEFAULT_HUB_DATA: HubData = {
  projects: [],
  active_project: null,
  framework_version: null,
  auto_sync: true,
  last_sync_check: null,
};

/** Get the global aidd home directory (~/.aidd/). */
export function aiddHome(): string {
  return join(homedir(), '.aidd');
}

/** Get the global framework directory (~/.aidd/framework/). */
export function frameworkDir(): string {
  return join(aiddHome(), 'framework');
}

/** Path to hub.json. */
function hubJsonPath(): string {
  return join(aiddHome(), 'hub.json');
}

/** Ensure ~/.aidd/ exists. */
export function ensureAiddHome(): void {
  const dir = aiddHome();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Ensure ~/.aidd/framework/ and category subdirs exist. */
export function ensureFrameworkDirs(): void {
  const fw = frameworkDir();
  const categories = ['rules', 'skills', 'knowledge', 'workflows', 'templates', 'spec'];
  for (const cat of categories) {
    const dir = join(fw, cat);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/** Load hub.json (creates default if missing). */
export function loadHubData(): HubData {
  ensureAiddHome();
  const path = hubJsonPath();

  if (!existsSync(path)) {
    return { ...DEFAULT_HUB_DATA };
  }

  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as Partial<HubData>;
    return {
      projects: data.projects ?? [],
      active_project: data.active_project ?? null,
      framework_version: data.framework_version ?? null,
      auto_sync: data.auto_sync ?? true,
      last_sync_check: data.last_sync_check ?? null,
    };
  } catch {
    return { ...DEFAULT_HUB_DATA };
  }
}

/** Save hub.json. */
export function saveHubData(data: HubData): void {
  ensureAiddHome();
  writeFileSync(hubJsonPath(), JSON.stringify(data, null, 2), 'utf-8');
}
