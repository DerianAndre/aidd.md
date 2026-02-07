import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { detectProject } from '@aidd.md/mcp-shared';
import { loadHubData, saveHubData, type ProjectEntry } from '../lib/hub-store.js';

/**
 * `aidd projects list` — List registered projects.
 */
export function listProjects(): void {
  const data = loadHubData();
  if (data.projects.length === 0) {
    console.log('No projects registered. Use `aidd projects add <path>` to add one.');
    return;
  }

  console.log(`Registered projects (${data.projects.length}):\n`);
  for (const p of data.projects) {
    const active = p.path === data.active_project ? ' [active]' : '';
    const exists = existsSync(p.path) ? '' : ' (missing)';
    console.log(`  ${p.name}${active}${exists}`);
    console.log(`    ${p.path}`);
  }
}

/**
 * `aidd projects add <path>` — Register a project.
 */
export function addProject(projectPath: string): void {
  const absPath = resolve(projectPath);
  if (!existsSync(absPath)) {
    console.error(`Error: Directory not found: ${absPath}`);
    process.exit(1);
  }

  const data = loadHubData();

  // Check for duplicates
  if (data.projects.some((p) => p.path === absPath)) {
    console.log(`Project already registered: ${absPath}`);
    return;
  }

  // Detect project
  const name = detectProjectName(absPath);
  const detected = detectProject(absPath).detected;

  const entry: ProjectEntry = { name, path: absPath, detected };
  data.projects.push(entry);

  // Set as active if first project
  if (!data.active_project) {
    data.active_project = absPath;
  }

  saveHubData(data);
  console.log(`Added project: ${name}`);
  console.log(`  Path: ${absPath}`);
  console.log(`  AIDD detected: ${detected ? 'yes' : 'no'}`);
  if (data.active_project === absPath) {
    console.log('  Set as active project');
  }
}

/**
 * `aidd projects remove <path>` — Remove a project from registry.
 */
export function removeProject(projectPath: string): void {
  const absPath = resolve(projectPath);
  const data = loadHubData();

  const before = data.projects.length;
  data.projects = data.projects.filter((p) => p.path !== absPath);

  if (data.projects.length === before) {
    console.error(`Project not found in registry: ${absPath}`);
    process.exit(1);
  }

  if (data.active_project === absPath) {
    data.active_project = data.projects[0]?.path ?? null;
  }

  saveHubData(data);
  console.log(`Removed project: ${absPath}`);
}

function detectProjectName(dir: string): string {
  const pkgPath = resolve(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (typeof pkg.name === 'string') return pkg.name;
    } catch {
      // fallthrough
    }
  }
  return basename(dir);
}

