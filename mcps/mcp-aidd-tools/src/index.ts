import { startStdioServer } from '@aidd.md/mcp-shared';
import { createToolsServer } from './server.js';

const server = createToolsServer();
await startStdioServer(server);
