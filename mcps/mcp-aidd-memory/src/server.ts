import { createAiddServer, readPackageVersion } from '@aidd.md/mcp-shared';
import { memoryModules } from './modules/index.js';

const PKG_VERSION = readPackageVersion(import.meta.url);

export function createMemoryServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-memory',
    version: PKG_VERSION,
    instructions: 'AIDD development memory: session lifecycle, branch context, 3-layer memory search, permanent decisions/mistakes/conventions, AIDD lifecycle phases, model analytics, evolution analysis, content drafts, error diagnostics, and project health scoring.',
    modules: memoryModules,
    projectPath,
  });
}
