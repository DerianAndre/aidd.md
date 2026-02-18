import { createAiddServer, readPackageVersion } from '@aidd.md/mcp-shared';
import { toolsModules } from './modules/index.js';

const PKG_VERSION = readPackageVersion(import.meta.url);

export function createToolsServer(projectPath?: string) {
  return createAiddServer({
    name: 'aidd-tools',
    version: PKG_VERSION,
    instructions: 'AIDD code quality tools: 11 validators (TKB, SQL, secrets, Docker, i18n, a11y, performance, design tokens, tests, Mermaid, OpenAPI), 4 enforcement checks, commit message generation, migration planning, and CI reporting.',
    modules: toolsModules,
    projectPath,
  });
}
