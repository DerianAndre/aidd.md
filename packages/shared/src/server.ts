import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContentLoader } from './content-loader.js';
import { readJsonFile } from './fs.js';
import { createLogger } from './logger.js';
import { detectAiddRoot, findProjectRoot, statePaths } from './paths.js';
import { detectProject } from './project-detector.js';
import { createErrorResult } from './response.js';
import { deepMerge } from './utils.js';
import type { AiddConfig, AiddServerOptions, ModuleContext, ToolDefinition } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

export { McpServer };

/**
 * Create and configure an AIDD MCP server.
 * Ported from EnXingaPay's createMcpServer pattern with module support.
 */
export function createAiddServer(options: AiddServerOptions): McpServer {
  const logger = createLogger(options.name);
  const projectPath = options.projectPath ?? process.env['AIDD_PROJECT_PATH'];

  // Detect project
  const projectRoot = findProjectRoot(projectPath);
  const aiddRoot = detectAiddRoot(projectRoot);
  const projectInfo = detectProject(projectPath);

  // Load config
  const state = statePaths(projectRoot);
  const projectConfig = readJsonFile<Partial<AiddConfig>>(state.config);
  const config = projectConfig
    ? deepMerge(DEFAULT_CONFIG, projectConfig)
    : DEFAULT_CONFIG;

  // Create content loader
  // TODO: bundledRoot will be set when content bundling is implemented
  const contentLoader = new ContentLoader(null, aiddRoot, config.content.overrideMode);

  // Build module context
  const context: ModuleContext = {
    contentLoader,
    projectInfo,
    config,
    logger,
    projectRoot,
    aiddDir: state.root,
  };

  // Create MCP server
  const server = new McpServer(
    { name: options.name, version: options.version },
    options.instructions ? { instructions: options.instructions } : undefined,
  );

  // Register all modules
  for (const mod of options.modules) {
    logger.info(`Registering module: ${mod.name}`);
    mod.register(server, context);
  }

  // Run onReady hooks (fire and forget — non-blocking)
  Promise.allSettled(
    options.modules
      .filter((m) => m.onReady)
      .map((m) => m.onReady!(context)),
  ).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error('Module onReady failed', result.reason);
      }
    }
  });

  return server;
}

/** Register a tool on an MCP server with error-handling wrapper. */
export function registerTool(server: McpServer, tool: ToolDefinition): void {
  server.tool(
    tool.name,
    tool.description,
    tool.schema,
    tool.annotations ?? {},
    async (args) => {
      try {
        return await tool.handler(args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createErrorResult(message);
      }
    },
  );
}

/** Start the server with stdio transport. */
export async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
