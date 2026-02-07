import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Finds the project root by walking up from a start directory.
 * Looks for AIDD markers: AGENTS.md, rules/, or package.json.
 */
export function findProjectRoot(startDir?: string): string {
  let dir = startDir ?? process.env['AIDD_PROJECT_PATH'] ?? process.cwd();
  const root = resolve(dir, '/');

  while (dir !== root) {
    // AIDD marker: AGENTS.md is the strongest signal
    if (existsSync(resolve(dir, 'AGENTS.md'))) return dir;
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
 * Some projects use root-level files, others use an `ai/` subfolder.
 * Framework content lives under `content/` (rules, skills, workflows, etc.).
 */
export function detectAiddRoot(projectRoot: string): string {
  // Check ai/ subfolder first (e.g., ai/AGENTS.md, ai/content/rules/)
  const aiDir = resolve(projectRoot, 'ai');
  if (existsSync(resolve(aiDir, 'AGENTS.md'))) return aiDir;
  if (existsSync(resolve(aiDir, 'content', 'rules'))) return aiDir;

  // Default: root level
  return projectRoot;
}

/** Standard AIDD paths relative to an AIDD root. */
export function aiddPaths(aiddRoot: string) {
  const content = resolve(aiddRoot, 'content');
  return {
    agentsMd: resolve(aiddRoot, 'AGENTS.md'),
    rules: resolve(content, 'rules'),
    skills: resolve(content, 'skills'),
    workflows: resolve(content, 'workflows'),
    specs: resolve(content, 'specs'),
    knowledge: resolve(content, 'knowledge'),
    templates: resolve(content, 'templates'),
  } as const;
}

/** Standard .aidd/ state directory paths. */
export function statePaths(projectRoot: string) {
  const aiddDir = resolve(projectRoot, '.aidd');
  return {
    root: aiddDir,
    config: resolve(aiddDir, 'config.json'),
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
