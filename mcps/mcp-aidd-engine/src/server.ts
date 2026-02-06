import { createAiddServer } from '@aidd.md/mcp-shared';
import { coreModules } from '@aidd.md/mcp-core/modules';
import { memoryModules } from '@aidd.md/mcp-memory/modules';
import { toolsModules } from '@aidd.md/mcp-tools/modules';

const PKG_VERSION = '1.0.0';

export function createMonolithicServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd',
    version: PKG_VERSION,
    modules: [...coreModules, ...memoryModules, ...toolsModules],
    projectPath,
  });
}
