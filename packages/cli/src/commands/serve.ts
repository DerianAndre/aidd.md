import { spawn } from 'node:child_process';

type ServerMode = 'engine' | 'core' | 'memory' | 'tools';

const MODE_TO_PACKAGE: Record<ServerMode, string> = {
  engine: '@aidd.md/mcp-engine',
  core: '@aidd.md/mcp-core',
  memory: '@aidd.md/mcp-memory',
  tools: '@aidd.md/mcp-tools',
};

/**
 * `aidd serve [--mode <mode>]` — Start MCP server.
 */
export function runServe(options: { mode?: string }): void {
  const mode = (options.mode ?? 'engine') as ServerMode;

  if (!Object.keys(MODE_TO_PACKAGE).includes(mode)) {
    console.error(`Unknown mode: ${mode}`);
    console.error(`Valid modes: ${Object.keys(MODE_TO_PACKAGE).join(', ')}`);
    process.exit(1);
  }

  const pkg = MODE_TO_PACKAGE[mode];
  console.log(`Starting ${pkg} in stdio mode...`);
  console.log('Press Ctrl+C to stop.\n');

  // Resolve the package entry point relative to the monorepo
  // In production, `npx @aidd.md/mcp-engine` is the recommended way.
  // For dev, we spawn npx.
  const child = spawn('npx', ['-y', pkg], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`Failed to start MCP server: ${err.message}`);
    process.exit(1);
  });
}
