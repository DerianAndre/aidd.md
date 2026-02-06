import { createAiddServer } from '@aidd.md/mcp-shared';
import { coreModules } from './modules/index.js';

const PKG_VERSION = '1.0.0';

export function createCoreServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-core',
    version: PKG_VERSION,
    instructions: 'AIDD framework guidance: project detection, task classification, agent routing, knowledge base queries, heuristic decisions, context optimization, and project scaffolding.',
    modules: coreModules,
    projectPath,
  });
}
