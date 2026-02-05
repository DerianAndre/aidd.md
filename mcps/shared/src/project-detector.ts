import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readJsonFile } from './fs.js';
import { detectAiddRoot, findProjectRoot } from './paths.js';
import type { ProjectInfo, StackInfo } from './types.js';

/** Detect AIDD project structure and stack info. */
export function detectProject(projectPath?: string): ProjectInfo {
  const root = findProjectRoot(projectPath);
  const aiddRoot = detectAiddRoot(root);

  const markers = {
    agentsMd: existsSync(resolve(aiddRoot, 'AGENTS.md')),
    rules: existsSync(resolve(aiddRoot, 'rules')),
    skills: existsSync(resolve(aiddRoot, 'skills')),
    workflows: existsSync(resolve(aiddRoot, 'workflows')),
    spec: existsSync(resolve(aiddRoot, 'spec')),
    knowledge: existsSync(resolve(aiddRoot, 'knowledge')),
    templates: existsSync(resolve(aiddRoot, 'templates')),
    aiddDir: existsSync(resolve(root, '.aidd')),
    memory: existsSync(resolve(aiddRoot, 'memory')) || existsSync(resolve(root, 'ai', 'memory')),
  };

  const detected = markers.agentsMd || markers.rules || markers.skills;

  const stack = detectStack(root);

  return {
    detected,
    root,
    aiddRoot,
    markers,
    stack,
  };
}

/** Parse package.json for stack detection. */
function detectStack(projectRoot: string): StackInfo {
  const pkgPath = resolve(projectRoot, 'package.json');
  const pkg = readJsonFile<Record<string, unknown>>(pkgPath);

  if (!pkg) {
    return { dependencies: {}, devDependencies: {} };
  }

  return {
    name: typeof pkg['name'] === 'string' ? pkg['name'] : undefined,
    version: typeof pkg['version'] === 'string' ? pkg['version'] : undefined,
    dependencies: (pkg['dependencies'] as Record<string, string>) ?? {},
    devDependencies: (pkg['devDependencies'] as Record<string, string>) ?? {},
  };
}
