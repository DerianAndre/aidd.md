import { startStdioServer } from '@aidd.md/mcp-shared';
import { createMemoryServer } from './server.js';

const server = createMemoryServer();
await startStdioServer(server);
