import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../../../../../../');
const mcpsDir = join(repoRoot, 'mcps');
const docsDir = join(repoRoot, 'docs', 'ai');

function walkModuleIndexFiles(): string[] {
  const packageDirs = ['mcp-aidd-core', 'mcp-aidd-memory', 'mcp-aidd-tools'];
  const files: string[] = [];

  for (const pkg of packageDirs) {
    const modulesDir = join(mcpsDir, pkg, 'src', 'modules');
    for (const entry of readdirSync(modulesDir)) {
      const maybeDir = join(modulesDir, entry);
      if (!statSync(maybeDir).isDirectory()) continue;
      const indexFile = join(maybeDir, 'index.ts');
      if (existsSync(indexFile)) {
        files.push(indexFile);
      }
    }
  }

  return files;
}

function extractSourceToolCount(): number {
  const seen = new Set<string>();
  const files = walkModuleIndexFiles();

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const toolNameRe = /name:\s*['"]([^'"]+)['"]/g;
    const validatorRe = /registerValidator\(\s*\w+\s*,\s*'([^']+)'/g;

    for (let m = toolNameRe.exec(src); m !== null; m = toolNameRe.exec(src)) {
      const name = m[1]!;
      if (name.startsWith('aidd_')) seen.add(name);
    }

    for (let m = validatorRe.exec(src); m !== null; m = validatorRe.exec(src)) {
      const name = m[1]!;
      if (name.startsWith('aidd_')) seen.add(name);
    }
  }

  return seen.size;
}

describe('docs generator parity', () => {
  it('mcp-map tool count matches source registrations', () => {
    const sourceToolCount = extractSourceToolCount();
    const mcpMap = readFileSync(join(docsDir, 'mcp-map.md'), 'utf8');
    const docsCount = Number(
      mcpMap.match(/##\s+(\d+)\s+Tools\s+across/i)?.[1] ?? NaN,
    );

    expect(Number.isFinite(docsCount)).toBe(true);
    expect(docsCount).toBe(sourceToolCount);
  });

  it('pattern-signatures documents TID bonus when detector supports it', () => {
    const detectorSrc = readFileSync(
      join(
        mcpsDir,
        'mcp-aidd-memory',
        'src',
        'modules',
        'pattern-killer',
        'detector.ts',
      ),
      'utf8',
    );
    const docs = readFileSync(join(docsDir, 'pattern-signatures.md'), 'utf8');

    const hasTidInSource = /\btidBonus\b/.test(detectorSrc);
    if (!hasTidInSource) {
      expect(docs).not.toContain('TID bonus active');
      return;
    }

    expect(docs).toContain('TID bonus active');
  });
});
