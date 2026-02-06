import { createAiddServer } from '@aidd.md/mcp-shared';
import { memoryModules } from './modules/index.js';

const PKG_VERSION = '1.0.0';

export function createMemoryServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-memory',
    version: PKG_VERSION,
    instructions: 'AIDD development memory: session lifecycle, branch context, 3-layer memory search, permanent decisions/mistakes/conventions, ASDD lifecycle phases, model analytics, evolution analysis, content drafts, error diagnostics, and project health scoring.',
    modules: memoryModules,
    projectPath,
  });
}
