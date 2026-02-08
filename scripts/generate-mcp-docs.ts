/**
 * S2D Pipeline — Source-to-Doc generator for docs/ai/
 *
 * Extracts tool registrations, SQLite schema, pattern signatures, hook
 * subscribers, and constants from MCP source code. Renders 5 M2M markdown
 * files (<200 tokens each) with SHA-256 checksum for CI staleness detection.
 *
 * Usage:
 *   pnpm mcp:docs          # Generate docs/ai/
 *   pnpm mcp:docs:check    # Verify docs are up-to-date (exit 1 if stale)
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  readdirSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolInfo {
  name: string;
  module: string;
  package: string;
}

interface TableInfo {
  name: string;
  type: 'table' | 'fts5';
  pk: string;
  keyColumns: string;
  indexCount: number;
  triggerCount: number;
  notes: string;
}

interface SignatureInfo {
  pattern: string;
  category: string;
}

interface DimensionInfo {
  name: string;
  formula: string;
}

interface PatternData {
  signatures: SignatureInfo[];
  fingerprintMetrics: string[];
  auditDimensions: DimensionInfo[];
}

interface HookInfo {
  name: string;
  trigger: string;
  action: string;
}

interface ConstantMap {
  autoApplyThreshold: number;
  draftThreshold: number;
  maxConsecutiveFailures: number;
  analysisInterval: number;
  pruneInterval: number;
  maxSessions: number;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, '..');
const MCPS_DIR = join(ROOT, 'mcps');
const DOCS_DIR = join(ROOT, 'docs', 'ai');
const MIGRATIONS_FILE = join(
  MCPS_DIR,
  'mcp-aidd-memory',
  'src',
  'storage',
  'migrations.ts',
);
const DETECTOR_FILE = join(
  MCPS_DIR,
  'mcp-aidd-memory',
  'src',
  'modules',
  'pattern-killer',
  'detector.ts',
);
const HOOKS_FILE = join(
  MCPS_DIR,
  'mcp-aidd-memory',
  'src',
  'modules',
  'hooks.ts',
);
const EVOLUTION_FILE = join(
  MCPS_DIR,
  'mcp-aidd-memory',
  'src',
  'modules',
  'evolution',
  'index.ts',
);
const PATTERN_KILLER_FILE = join(
  MCPS_DIR,
  'mcp-aidd-memory',
  'src',
  'modules',
  'pattern-killer',
  'index.ts',
);
const TYPES_FILE = join(ROOT, 'packages', 'shared', 'src', 'types.ts');

const PKG_MAP: Record<string, string> = {
  'mcp-aidd-core': 'core',
  'mcp-aidd-memory': 'memory',
  'mcp-aidd-tools': 'tools',
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function readText(filePath: string): string {
  if (!existsSync(filePath)) {
    console.error(`Missing source file: ${filePath}`);
    process.exit(2);
  }
  return readFileSync(filePath, 'utf-8');
}

function writeAtomic(filePath: string, content: string): void {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, filePath);
}

// ---------------------------------------------------------------------------
// Extraction: Tool registrations
// ---------------------------------------------------------------------------

function walkModuleIndexFiles(): Array<{
  filePath: string;
  pkg: string;
  module: string;
}> {
  const results: Array<{ filePath: string; pkg: string; module: string }> = [];

  for (const pkgDir of Object.keys(PKG_MAP)) {
    const modulesDir = join(MCPS_DIR, pkgDir, 'src', 'modules');
    if (!existsSync(modulesDir)) continue;

    for (const entry of readdirSync(modulesDir)) {
      const subDir = join(modulesDir, entry);
      if (!statSync(subDir).isDirectory()) continue;
      const indexFile = join(subDir, 'index.ts');
      if (existsSync(indexFile)) {
        results.push({
          filePath: indexFile,
          pkg: PKG_MAP[pkgDir]!,
          module: entry,
        });
      }
    }
  }

  return results;
}

function extractToolRegistrations(): ToolInfo[] {
  const tools: ToolInfo[] = [];
  const seen = new Set<string>();
  const moduleFiles = walkModuleIndexFiles();

  for (const { filePath, pkg, module } of moduleFiles) {
    const src = readText(filePath);

    // Pattern 1: registerTool with name: 'aidd_xxx' (string literal, not shorthand)
    const toolNameRe = /name:\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = toolNameRe.exec(src)) !== null) {
      const name = m[1]!;
      if (name.startsWith('aidd_') && !seen.has(name)) {
        seen.add(name);
        tools.push({ name, module, package: pkg });
      }
    }

    // Pattern 2: registerValidator(server, 'aidd_xxx', ...)
    const validatorRe = /registerValidator\(\s*\w+\s*,\s*'([^']+)'/g;
    while ((m = validatorRe.exec(src)) !== null) {
      const name = m[1]!;
      if (name.startsWith('aidd_') && !seen.has(name)) {
        seen.add(name);
        tools.push({ name, module, package: pkg });
      }
    }
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Extraction: Schema DDL
// ---------------------------------------------------------------------------

const JSON_COLUMNS = new Set([
  'data',
  'facts',
  'concepts',
  'phases',
  'scores',
  'before_state',
  'files_read',
  'files_modified',
]);

const FK_COLUMNS = new Set([
  'session_id',
  'candidate_id',
  'pattern_id',
  'memory_session_id',
  'parent_session_id',
]);

function extractSchema(): TableInfo[] {
  const src = readText(MIGRATIONS_FILE);

  const schemaMatch = src.match(/export\s+const\s+SCHEMA\s*=\s*`([\s\S]*?)`;/);
  if (!schemaMatch) {
    console.error('Could not find SCHEMA constant in migrations.ts');
    process.exit(2);
  }
  const ddl = schemaMatch[1]!;
  const tables: TableInfo[] = [];

  // Regular tables
  const tableRe =
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/g;
  let m: RegExpExecArray | null;

  while ((m = tableRe.exec(ddl)) !== null) {
    const name = m[1]!;
    const body = m[2]!;

    // Determine PK
    let pk = '';
    const aiPk = body.match(
      /(\w+)\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i,
    );
    const textPk = body.match(/(\w+)\s+TEXT\s+PRIMARY\s+KEY/i);

    if (aiPk) pk = `${aiPk[1]} INT AI`;
    else if (textPk) pk = `${textPk[1]} TEXT`;

    const pkCol = aiPk?.[1] ?? textPk?.[1];

    // Extract columns (non-PK)
    const cols: string[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^(\w+)\s+(TEXT|INTEGER|REAL|INT)\b/i);
      if (!colMatch) continue;
      const colName = colMatch[1]!;
      if (colName === pkCol) continue;

      let label = colName;
      if (FK_COLUMNS.has(colName)) label += ' FK';
      else if (JSON_COLUMNS.has(colName)) label += '(JSON)';
      else if (colName.endsWith('_at')) continue; // skip timestamp cols for brevity
      cols.push(label);
    }

    tables.push({
      name,
      type: 'table',
      pk,
      keyColumns: cols.join(', '),
      indexCount: 0,
      triggerCount: 0,
      notes: '',
    });
  }

  // FTS5 virtual tables
  const ftsRe =
    /CREATE\s+VIRTUAL\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s+USING\s+fts5\(/g;
  while ((m = ftsRe.exec(ddl)) !== null) {
    tables.push({
      name: m[1]!,
      type: 'fts5',
      pk: 'FTS5',
      keyColumns: '',
      indexCount: 0,
      triggerCount: 0,
      notes: 'porter unicode61',
    });
  }

  // Count indexes per table
  const idxRe =
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+(\w+)/g;
  while ((m = idxRe.exec(ddl)) !== null) {
    const t = tables.find((t) => t.name === m![1]);
    if (t) t.indexCount++;
  }

  // Count triggers per table
  const trigRe =
    /CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+\w+\s+AFTER\s+\w+\s+ON\s+(\w+)/g;
  while ((m = trigRe.exec(ddl)) !== null) {
    const t = tables.find((t) => t.name === m![1]);
    if (t) t.triggerCount++;
  }

  // Generate notes
  for (const t of tables) {
    const notes: string[] = [];
    if (t.indexCount > 0) notes.push(`${t.indexCount} idx`);
    if (t.triggerCount > 0) notes.push(`${t.triggerCount} triggers`);
    if (t.type === 'fts5') notes.push('porter unicode61');
    t.notes = notes.join(', ');
  }

  return tables;
}

// ---------------------------------------------------------------------------
// Extraction: Pattern signatures
// ---------------------------------------------------------------------------

function extractPatternSignatures(): PatternData {
  const src = readText(DETECTOR_FILE);

  // Signatures: { pattern: /xxx/gi, category: 'yyy', label: 'zzz' }
  const signatures: SignatureInfo[] = [];
  const sigRe =
    /\{\s*pattern:\s*\/(.+?)\/\w*,\s*category:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = sigRe.exec(src)) !== null) {
    signatures.push({ pattern: m[1]!, category: m[2]! });
  }

  // Fingerprint metrics — from computeFingerprint return block
  const fpBlock = src.match(
    /function\s+computeFingerprint[\s\S]*?return\s*\{([\s\S]*?)\};/,
  );
  const fingerprintMetrics: string[] = [];
  if (fpBlock) {
    const metricRe = /(\w+):/g;
    let mm: RegExpExecArray | null;
    while ((mm = metricRe.exec(fpBlock[1]!)) !== null) {
      fingerprintMetrics.push(mm[1]!);
    }
  }

  // Audit dimensions — from dimensions: { ... } inside computeAuditScore
  const auditBlock = src.match(/dimensions:\s*\{([\s\S]*?)\}/);
  const auditDimensions: DimensionInfo[] = [];
  if (auditBlock) {
    const dimRe = /^\s*(\w+),?\s*$/gm;
    let dm: RegExpExecArray | null;
    while ((dm = dimRe.exec(auditBlock[1]!)) !== null) {
      auditDimensions.push({ name: dm[1]!, formula: '' });
    }
  }

  // Formulas are computed logic — map from known dimension names
  const formulaMap: Record<string, string> = {
    lexicalDiversity: 'min(20, TTR*40)',
    structuralVariation: 'max(0, 20-|variance-30|*0.3)',
    voiceAuthenticity: '20-passivePen-fillerPen',
    patternAbsence: '20-min(20, matches*3)',
    semanticPreservation: '15 (default)',
  };
  for (const d of auditDimensions) {
    d.formula = formulaMap[d.name] ?? '';
  }

  return { signatures, fingerprintMetrics, auditDimensions };
}

// ---------------------------------------------------------------------------
// Extraction: Hook subscribers
// ---------------------------------------------------------------------------

function extractHookSubscribers(): HookInfo[] {
  const hooks: HookInfo[] = [];
  const files = [PATTERN_KILLER_FILE, EVOLUTION_FILE];

  for (const filePath of files) {
    const src = readText(filePath);

    // Match comment line followed by hookBus.register with event type check
    // Use \r?\n to handle both LF and CRLF line endings
    const hookRe =
      /\/\/\s*(.+?)\r?\n\s*hookBus\.register\('([^']+)',\s*async\s*\(event\)\s*=>\s*\{[\s\S]*?event\.type\s*!==\s*'([^']+)'/g;
    let m: RegExpExecArray | null;
    while ((m = hookRe.exec(src)) !== null) {
      const comment = m[1]!.replace(/^\d+\.\d+:\s*/, '').trim();
      hooks.push({
        name: m[2]!,
        trigger: m[3]!,
        action: comment,
      });
    }
  }

  return hooks;
}

// ---------------------------------------------------------------------------
// Extraction: Evolution detector types
// ---------------------------------------------------------------------------

function extractDetectorTypes(): string[] {
  const analyzerPath = join(
    MCPS_DIR,
    'mcp-aidd-memory',
    'src',
    'modules',
    'evolution',
    'analyzer.ts',
  );
  const src = readText(analyzerPath);

  const types = new Set<string>();
  const re = /type:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    types.add(m[1]!);
  }

  return [...types];
}

// ---------------------------------------------------------------------------
// Extraction: Constants
// ---------------------------------------------------------------------------

function extractConstants(): ConstantMap {
  const typesStr = readText(TYPES_FILE);
  const evoStr = readText(EVOLUTION_FILE);
  const hooksStr = readText(HOOKS_FILE);

  const getNum = (src: string, re: RegExp, fallback: number): number => {
    const m = src.match(re);
    return m ? parseInt(m[1]!, 10) : fallback;
  };

  return {
    autoApplyThreshold: getNum(typesStr, /autoApplyThreshold:\s*(\d+)/, 90),
    draftThreshold: getNum(typesStr, /draftThreshold:\s*(\d+)/, 70),
    maxConsecutiveFailures: getNum(
      hooksStr,
      /MAX_CONSECUTIVE_FAILURES\s*=\s*(\d+)/,
      3,
    ),
    analysisInterval: getNum(evoStr, /ANALYSIS_INTERVAL\s*=\s*(\d+)/, 5),
    pruneInterval: getNum(evoStr, /PRUNE_INTERVAL\s*=\s*(\d+)/, 10),
    maxSessions: getNum(evoStr, /MAX_SESSIONS\s*=\s*(\d+)/, 200),
  };
}

// ---------------------------------------------------------------------------
// Render: index.md
// ---------------------------------------------------------------------------

function renderIndex(
  tools: ToolInfo[],
  tables: TableInfo[],
  hooks: HookInfo[],
  constants: ConstantMap,
  checksum: string,
): string {
  const pkgCounts = new Map<string, number>();
  for (const t of tools) {
    pkgCounts.set(t.package, (pkgCounts.get(t.package) ?? 0) + 1);
  }

  const uniqueModules = new Set(tools.map((t) => `${t.package}/${t.module}`));
  const tableCount = tables.filter((t) => t.type === 'table').length;
  const ftsCount = tables.filter((t) => t.type === 'fts5').length;

  return [
    `# AIDD MCP — Context Hydration Vector`,
    ``,
    `archChecksum: ${checksum}`,
    `toolCount: ${tools.length}`,
    `lastMutation: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `## Architecture`,
    `Engine (single process) ← Core(${pkgCounts.get('core') ?? 0}) + Memory(${pkgCounts.get('memory') ?? 0}) + Tools(${pkgCounts.get('tools') ?? 0}) = ${tools.length} tools, ${uniqueModules.size} modules`,
    ``,
    `## Storage`,
    `SQLite WAL | ${tableCount} tables + ${ftsCount} FTS5 | FK=ON | busy_timeout=5000`,
    ``,
    `## Memory Layers`,
    `L1 Session → L2 Observation(FTS5) → L3 Branch → L4 Permanent → L5 Evolution`,
    ``,
    `## Constants`,
    `autoApply: >=${constants.autoApplyThreshold} | draft: ${constants.draftThreshold}-${constants.autoApplyThreshold - 1} | pending: <${constants.draftThreshold}`,
    `circuitBreaker: ${constants.maxConsecutiveFailures} failures | analysis: every ${constants.analysisInterval}th session | prune: every ${constants.pruneInterval}th`,
    ``,
    `## Files`,
    `- [mcp-map.md](mcp-map.md) — ${tools.length} tools across ${uniqueModules.size} modules`,
    `- [sql-schema.md](sql-schema.md) — ${tableCount} tables + ${ftsCount} FTS5`,
    `- [pattern-signatures.md](pattern-signatures.md) — pattern detection system`,
    `- [memory-handover.md](memory-handover.md) — ${hooks.length} hooks, memory lifecycle`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Render: mcp-map.md
// ---------------------------------------------------------------------------

function renderMcpMap(tools: ToolInfo[]): string {
  const byPkg = new Map<string, Map<string, string[]>>();
  for (const t of tools) {
    if (!byPkg.has(t.package)) byPkg.set(t.package, new Map());
    const pkgMap = byPkg.get(t.package)!;
    if (!pkgMap.has(t.module)) pkgMap.set(t.module, []);
    pkgMap.get(t.module)!.push(t.name);
  }

  const uniqueModules = new Set(tools.map((t) => `${t.package}/${t.module}`));
  const lines: string[] = [
    `# MCP & Tool Mapping`,
    ``,
    `## ${tools.length} Tools across ${uniqueModules.size} Modules`,
    ``,
  ];

  for (const [pkg, modules] of byPkg) {
    const pkgCount = Array.from(modules.values()).reduce(
      (s, a) => s + a.length,
      0,
    );
    lines.push(`### ${pkg} (${pkgCount})`);
    for (const [mod, names] of modules) {
      lines.push(`- **${mod}**: ${names.join(', ')}`);
    }
    lines.push('');
  }

  lines.push(`## Critical Paths`);
  lines.push(
    `- Start: aidd_start → session(start) → hookBus`,
  );
  lines.push(
    `- Memory: observation → FTS5 → memory_search → memory_context → memory_get`,
  );
  lines.push(
    `- Evolution: session(end) → hookBus → analyze → candidates → draft/auto-apply`,
  );
  lines.push(
    `- Pattern: audit → detect+fingerprint+score → pattern_detections`,
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Render: sql-schema.md
// ---------------------------------------------------------------------------

function renderSqlSchema(tables: TableInfo[]): string {
  const realTables = tables.filter((t) => t.type === 'table');
  const totalIdx = tables.reduce((s, t) => s + t.indexCount, 0);
  const totalTrig = tables.reduce((s, t) => s + t.triggerCount, 0);

  const lines: string[] = [
    `# SQLite Schema (${realTables.length} tables, ${totalIdx} idx, ${totalTrig} triggers)`,
    ``,
    `PRAGMA: WAL, FK=ON, busy_timeout=5000`,
    ``,
    `## Tables`,
    ``,
    `| Table | PK | Key Columns | Notes |`,
    `|-------|-----|------------|-------|`,
  ];

  for (const t of tables) {
    lines.push(
      `| ${t.name} | ${t.pk} | ${t.keyColumns} | ${t.notes} |`,
    );
  }

  lines.push('');
  lines.push(`## Pruning (pruneStaleData)`);
  lines.push(
    `pattern_detections: >30d | observations: >1K cap | sessions_indexed: >50`,
  );
  lines.push('');
  lines.push(`## FTS Search`);
  lines.push(
    `BM25 ranking, query tokens joined with OR, relevance=min(1, |rank|/10)`,
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Render: pattern-signatures.md
// ---------------------------------------------------------------------------

function renderPatternSignatures(data: PatternData): string {
  const lines: string[] = [
    `# Pattern Detection System`,
    ``,
    `## Built-in Signatures (${data.signatures.length})`,
    ``,
    `| # | Pattern | Cat |`,
    `|---|---------|-----|`,
  ];

  for (let i = 0; i < data.signatures.length; i++) {
    const s = data.signatures[i]!;
    lines.push(`| ${i + 1} | \`${s.pattern}\` | ${s.category} |`);
  }

  lines.push('');
  lines.push(`All \`/gi\`. DB \`banned_patterns\` extends at runtime.`);
  lines.push('');
  lines.push(
    `## Fingerprint (${data.fingerprintMetrics.length} metrics)`,
  );
  lines.push(data.fingerprintMetrics.join(', '));
  lines.push('');
  lines.push(
    `## Audit Score (${data.auditDimensions.length}x20=100)`,
  );
  lines.push('');
  lines.push(`| Dim | Calc |`);
  lines.push(`|-----|------|`);
  for (const d of data.auditDimensions) {
    lines.push(`| ${d.name} | ${d.formula} |`);
  }
  lines.push('');
  lines.push(`Verdict: >=70 pass | >=40 retry | <40 escalate`);
  lines.push('');
  lines.push(`## False Positive Protocol`);
  lines.push(
    `Report→useCount*=0.85→auto-deactivate at useCount<2 (learned only)`,
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Render: memory-handover.md
// ---------------------------------------------------------------------------

function renderMemoryHandover(
  hooks: HookInfo[],
  constants: ConstantMap,
  detectorTypes: string[],
): string {
  const lines: string[] = [
    `# Memory Handover (5 Layers)`,
    ``,
    `## Layer Stack`,
    '```',
    `L5 Evolution ← analyze(sessions, patternStats) → candidates`,
    `     ↑`,
    `L4 Permanent ← memory_add_{decision,mistake,convention} | memory_export → JSON`,
    `     ↑`,
    `L3 Branch ← branch(promote) ← session data | branch(merge) → permanent`,
    `     ↑`,
    `L2 Observation ← aidd_observation → FTS5 index | discoveryTokens ROI`,
    `     ↑`,
    `L1 Session ← session(start) → session(update) → session(end) → HookBus`,
    '```',
    ``,
    `## HookBus`,
    `Events: \`session_ended\`(sessionId), \`observation_saved\`(observationId, sessionId)`,
    `Circuit breaker: ${constants.maxConsecutiveFailures} consecutive failures → subscriber disabled`,
    ``,
    `### Subscribers (${hooks.length})`,
    ``,
    `| Hook | Trigger | Action |`,
    `|------|---------|--------|`,
  ];

  for (const h of hooks) {
    lines.push(`| ${h.name} | ${h.trigger} | ${h.action} |`);
  }

  lines.push('');
  lines.push(`## Confidence Tiers`);
  lines.push(
    `>=${constants.autoApplyThreshold}: auto-apply | ${constants.draftThreshold}-${constants.autoApplyThreshold - 1}: draft | <${constants.draftThreshold}: pending | <=20: auto-delete`,
  );
  lines.push('');
  lines.push(`## ${detectorTypes.length} Evolution Detectors`);
  lines.push(detectorTypes.join(', '));
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Checksum
// ---------------------------------------------------------------------------

const CHECKSUM_PLACEHOLDER = '__CHECKSUM_PLACEHOLDER__';

function computeChecksum(contents: string[]): string {
  const hash = createHash('sha256');
  for (const c of contents) {
    hash.update(c);
  }
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const isCheck = process.argv.includes('--check');

  // Extract all data from source
  const tools = extractToolRegistrations();
  const tables = extractSchema();
  const patternData = extractPatternSignatures();
  const hooks = extractHookSubscribers();
  const detectorTypes = extractDetectorTypes();
  const constants = extractConstants();

  // Render with placeholder checksum
  const indexPlaceholder = renderIndex(
    tools,
    tables,
    hooks,
    constants,
    CHECKSUM_PLACEHOLDER,
  );
  const mcpMap = renderMcpMap(tools);
  const sqlSchema = renderSqlSchema(tables);
  const patternSigs = renderPatternSignatures(patternData);
  const memoryHandover = renderMemoryHandover(hooks, constants, detectorTypes);

  // Compute checksum over all rendered content (with placeholder)
  const allContent = [
    indexPlaceholder,
    mcpMap,
    sqlSchema,
    patternSigs,
    memoryHandover,
  ];
  const checksum = computeChecksum(allContent);

  // Replace placeholder with actual checksum
  const indexFinal = indexPlaceholder.replace(
    CHECKSUM_PLACEHOLDER,
    checksum,
  );

  if (isCheck) {
    const existingPath = join(DOCS_DIR, 'index.md');
    if (!existsSync(existingPath)) {
      console.error(
        'docs/ai/index.md not found — run pnpm mcp:docs first',
      );
      process.exit(1);
    }

    const existing = readFileSync(existingPath, 'utf-8');
    const checksumMatch = existing.match(/archChecksum:\s*([a-f0-9]+)/);

    if (!checksumMatch) {
      console.error('No checksum found in existing docs/ai/index.md');
      process.exit(1);
    }

    if (checksumMatch[1] === checksum) {
      console.log(
        `docs/ai/ up-to-date (${checksum.slice(0, 12)}…) — ${tools.length} tools, ${tables.length} tables`,
      );
      process.exit(0);
    } else {
      console.error(
        `docs/ai/ STALE — expected ${checksum.slice(0, 12)}…, found ${checksumMatch[1]!.slice(0, 12)}…`,
      );
      console.error('Run: pnpm mcp:docs');
      process.exit(1);
    }
  }

  // Generate mode: write files
  mkdirSync(DOCS_DIR, { recursive: true });

  const files: Array<[string, string]> = [
    ['index.md', indexFinal],
    ['mcp-map.md', mcpMap],
    ['sql-schema.md', sqlSchema],
    ['pattern-signatures.md', patternSigs],
    ['memory-handover.md', memoryHandover],
  ];

  for (const [name, content] of files) {
    writeAtomic(join(DOCS_DIR, name), content);
  }

  console.log(
    `Generated ${files.length} files in docs/ai/ (${checksum.slice(0, 12)}…)`,
  );
  console.log(
    `  Tools: ${tools.length} | Tables: ${tables.length} | Signatures: ${patternData.signatures.length} | Hooks: ${hooks.length}`,
  );
}

main();
