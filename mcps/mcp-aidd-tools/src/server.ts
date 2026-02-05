import { createAiddServer } from '@aidd.md/mcp-shared';
import { toolsModules } from './modules/index.js';

const PKG_VERSION = '1.0.0';

export function createToolsServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-tools',
    version: PKG_VERSION,
    modules: toolsModules,
    projectPath,
  });
}
