import { describe, expect, it, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ModuleContext, ToolResult } from '@aidd.md/mcp-shared';
import { bootstrapModule } from '../modules/bootstrap/index.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

class MockMcpServer {
  readonly tools = new Map<string, ToolHandler>();

  tool(
    name: string,
    _description: string,
    _schema: unknown,
    _annotations: unknown,
    handler: ToolHandler,
  ): void {
    this.tools.set(name, handler);
  }

  registerResource(): void {
    // Not needed for these tests.
  }
}

function createContext(projectRoot: string): ModuleContext {
  return {
    contentLoader: {
      getIndex: () => ({
        agents: [],
        rules: [],
        skills: [],
        workflows: [],
        specs: [],
        knowledge: [],
        templates: [],
      }),
    } as ModuleContext['contentLoader'],
    projectInfo: {
      stack: {
        name: 'aidd.md',
        version: '1.0.0',
        dependencies: {},
      },
      markers: {
        agents: true,
        rules: true,
        skills: true,
        workflows: true,
        specs: true,
        knowledge: true,
        templates: true,
        aiddDir: true,
        memory: true,
      },
    } as ModuleContext['projectInfo'],
    config: {} as ModuleContext['config'],
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as ModuleContext['logger'],
    projectRoot,
    aiddDir: `${projectRoot}/.aidd`,
    services: {
      startSession: async () => ({
        id: 'session-e2e-1',
        status: 'active',
        startedAt: '2026-02-09T00:00:00.000Z',
      }),
    },
  };
}

function resultText(result: ToolResult): string {
  return result.content[0]?.type === 'text' ? result.content[0].text : '';
}

describe('aidd_start project scope guardrail', () => {
  it('accepts startup without path when server is already project-scoped', async () => {
    const server = new MockMcpServer();
    const projectRoot = 'C:/repo/aidd.md';
    bootstrapModule.register(server as unknown as McpServer, createContext(projectRoot));

    const start = server.tools.get('aidd_start');
    expect(start).toBeDefined();

    const result = await start!({
      branch: 'feature/scope-test',
      aiProvider: {
        provider: 'openai',
        model: 'gpt-5',
        modelId: 'gpt-5',
        client: 'codex-cli',
      },
      taskClassification: {
        domain: 'backend',
        nature: 'fix',
        complexity: 'low',
        fastTrack: true,
      },
    });

    expect(result.isError).not.toBe(true);
    expect(resultText(result)).toContain('session-e2e-1');
    expect(resultText(result)).not.toContain('Project scope mismatch');
  });

  it('fails fast when requested path differs from bound server project root', async () => {
    const server = new MockMcpServer();
    const projectRoot = 'C:/repo/aidd.md';
    bootstrapModule.register(server as unknown as McpServer, createContext(projectRoot));

    const start = server.tools.get('aidd_start');
    expect(start).toBeDefined();

    const result = await start!({
      path: 'C:/repo/other-project',
      taskClassification: {
        domain: 'backend',
        nature: 'fix',
        complexity: 'low',
      },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain('Project scope mismatch');
  });
});

