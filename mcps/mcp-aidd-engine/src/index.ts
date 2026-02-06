import { startStdioServer } from '@aidd.md/mcp-shared';
import { createEngineServer } from './server.js';

const server = createEngineServer();
await startStdioServer(server);
