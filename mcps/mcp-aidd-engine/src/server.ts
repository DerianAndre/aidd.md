import { createAiddServer } from '@aidd.md/mcp-shared';
import { coreModules } from '@aidd.md/mcp-core/modules';
import { memoryModules } from '@aidd.md/mcp-memory/modules';
import { toolsModules } from '@aidd.md/mcp-tools/modules';

const PKG_VERSION = '1.0.0';

export function createEngineServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-engine',
    version: PKG_VERSION,
    instructions: 'Complete AIDD AI-Driven Development framework: guidance + memory + validation. 63 tools for project detection, task routing, knowledge base, sessions, memory search, evolution, analytics, code validation, enforcement, and CI. Use aidd_bootstrap for one-call setup.',
    modules: [...coreModules, ...memoryModules, ...toolsModules],
    projectPath,
  });
}
