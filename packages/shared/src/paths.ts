import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContentPaths } from './types.js';

/**
 * Finds the project root by walking up from a start directory.
 * Looks for AIDD markers: .aidd/content/agents/, .aidd/content/rules/, or package.json.
 */
export function findProjectRoot(startDir?: string): string {
  let dir = startDir ?? process.env['AIDD_PROJECT_PATH'] ?? process.cwd();
  const root = resolve(dir, '/');

  while (dir !== root) {
    // AIDD marker: .aidd/content/ is the standard
    if (existsSync(resolve(dir, '.aidd', 'content', 'agents'))) return dir;
    if (existsSync(resolve(dir, '.aidd', 'content', 'rules'))) return dir;
    // Fallback: package.json (generic project root)
    if (existsSync(resolve(dir, 'package.json'))) return dir;
    dir = resolve(dir, '..');
  }

  // If nothing found, use the start dir
  return startDir ?? process.cwd();
}

/** Resolve a path relative to project root. */
export function fromRoot(projectRoot: string, ...segments: string[]): string {
  return resolve(projectRoot, ...segments);
}

/**
 * Detect where AIDD framework files live.
 * Standard: .aidd/ directory. Content under .aidd/content/.
 */
export function detectAiddRoot(projectRoot: string): string {
  const aiddDir = resolve(projectRoot, '.aidd');
  if (existsSync(resolve(aiddDir, 'content', 'agents'))) return aiddDir;
  if (existsSync(resolve(aiddDir, 'content', 'rules'))) return aiddDir;

  // Fallback: root level (source repo)
  return projectRoot;
}

/**
 * Standard AIDD paths relative to an AIDD root.
 * Accepts optional path overrides from config.content.paths.
 * Granular paths (e.g. paths.rules) take priority over the base content path.
 */
export function aiddPaths(aiddRoot: string, overrides?: ContentPaths) {
  const contentDir = overrides?.content
    ? resolve(aiddRoot, overrides.content)
    : resolve(aiddRoot, 'content');
  return {
    agents: overrides?.agents
      ? resolve(aiddRoot, overrides.agents)
      : resolve(contentDir, 'agents'),
    rules: overrides?.rules ? resolve(aiddRoot, overrides.rules) : resolve(contentDir, 'rules'),
    skills: overrides?.skills
      ? resolve(aiddRoot, overrides.skills)
      : resolve(contentDir, 'skills'),
    workflows: overrides?.workflows
      ? resolve(aiddRoot, overrides.workflows)
      : resolve(contentDir, 'workflows'),
    specs: overrides?.specs ? resolve(aiddRoot, overrides.specs) : resolve(contentDir, 'specs'),
    knowledge: overrides?.knowledge
      ? resolve(aiddRoot, overrides.knowledge)
      : resolve(contentDir, 'knowledge'),
    templates: overrides?.templates
      ? resolve(aiddRoot, overrides.templates)
      : resolve(contentDir, 'templates'),
  } as const;
}

/** Standard .aidd/ state directory paths. */
export function statePaths(projectRoot: string) {
  const aiddDir = resolve(projectRoot, '.aidd');
  return {
    root: aiddDir,
    config: resolve(aiddDir, 'config.json'),
    memory: resolve(aiddDir, 'memory'),
    sessionsActive: resolve(aiddDir, 'sessions', 'active'),
    sessionsCompleted: resolve(aiddDir, 'sessions', 'completed'),
    branches: resolve(aiddDir, 'branches'),
    branchesArchive: resolve(aiddDir, 'branches', 'archive'),
    drafts: resolve(aiddDir, 'drafts'),
    analytics: resolve(aiddDir, 'analytics'),
    evolution: resolve(aiddDir, 'evolution'),
    evolutionSnapshots: resolve(aiddDir, 'evolution', 'snapshots'),
    cache: resolve(aiddDir, 'cache'),
  } as const;
}
