import { startStdioServer } from '@aidd.md/mcp-shared';
import { createMonolithicServer } from './server.js';

const server = createMonolithicServer();
await startStdioServer(server);
