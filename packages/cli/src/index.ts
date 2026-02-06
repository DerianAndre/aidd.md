import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { listProjects, addProject, removeProject } from './commands/projects.js';
import { runIntegrate } from './commands/integrate.js';
import { runServe } from './commands/serve.js';
import { runSync } from './commands/sync.js';
import { runStatus } from './commands/status.js';
import { runDoctor } from './commands/doctor.js';

const program = new Command();

program
  .name('aidd')
  .description('aidd.md — AI-Driven Development Framework CLI')
  .version('1.0.0');

// ── init ───────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize ~/.aidd/ and populate framework skeleton')
  .action(() => {
    runInit();
  });

// ── projects ───────────────────────────────────────────────────────────────
const projects = program
  .command('projects')
  .description('Manage registered projects');

projects
  .command('list')
  .description('List all registered projects')
  .action(() => {
    listProjects();
  });

projects
  .command('add <path>')
  .description('Register a project')
  .action((path: string) => {
    addProject(path);
  });

projects
  .command('remove <path>')
  .description('Remove a project from registry')
  .action((path: string) => {
    removeProject(path);
  });

// ── integrate ──────────────────────────────────────────────────────────────
program
  .command('integrate <tool>')
  .description('Configure AI tool integration (claude, cursor, vscode, gemini, all)')
  .option('-p, --project <path>', 'Project path (defaults to active project or cwd)')
  .action((tool: string, options: { project?: string }) => {
    runIntegrate(tool, options);
  });

// ── serve ──────────────────────────────────────────────────────────────────
program
  .command('serve')
  .description('Start MCP server')
  .option('-m, --mode <mode>', 'Server mode: monolithic, core, memory, tools', 'monolithic')
  .action((options: { mode?: string }) => {
    runServe(options);
  });

// ── sync ───────────────────────────────────────────────────────────────────
program
  .command('sync')
  .description('Download and install framework from GitHub')
  .option('-v, --version <version>', 'Target version (defaults to latest)')
  .action(async (options: { version?: string }) => {
    await runSync(options);
  });

// ── status ─────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show framework version, projects, integrations, MCP status')
  .action(() => {
    runStatus();
  });

// ── doctor ─────────────────────────────────────────────────────────────────
program
  .command('doctor')
  .description('Full diagnostic check')
  .action(() => {
    runDoctor();
  });

program.parse();
