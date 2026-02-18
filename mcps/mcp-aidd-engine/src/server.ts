import { createAiddServer, readPackageVersion } from '@aidd.md/mcp-shared';
import { coreModules } from '@aidd.md/mcp-core/modules';
import { memoryModules } from '@aidd.md/mcp-memory/modules';
import { toolsModules } from '@aidd.md/mcp-tools/modules';

const PKG_VERSION = readPackageVersion(import.meta.url);

export function createEngineServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-engine',
    version: PKG_VERSION,
    instructions: 'Complete AIDD AI-Driven Development framework: guidance + memory + validation. Includes project detection, task routing, knowledge, sessions, memory search, evolution, analytics, validation, enforcement, and CI. Use aidd_start for one-call setup.',
    modules: [...coreModules, ...memoryModules, ...toolsModules],
    projectPath,
  });
}
