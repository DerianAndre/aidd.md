import { startStdioServer } from '@aidd.md/mcp-shared';
import { createCoreServer } from './server.js';

const server = createCoreServer();
await startStdioServer(server);
