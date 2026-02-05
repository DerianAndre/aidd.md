import { createAiddServer } from '@aidd.md/mcp-shared';
import { memoryModules } from './modules/index.js';

const PKG_VERSION = '1.0.0';

export function createMemoryServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-memory',
    version: PKG_VERSION,
    modules: memoryModules,
    projectPath,
  });
}
