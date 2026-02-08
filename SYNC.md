# S2D Pipeline — Source-to-Doc Sync

Auto-generates `docs/ai/*.md` from MCP source code. Replaces hand-maintained docs with extracted data.

## Commands

```bash
pnpm mcp:docs          # Generate docs/ai/ (5 files)
pnpm mcp:docs:check    # CI staleness check (exit 0=fresh, 1=stale, 2=missing source)
pnpm mcp:setup         # Full setup (includes mcp:docs)
```

## What It Extracts

| Data | Source File(s) | Regex |
|------|---------------|-------|
| Tool names | `mcps/*/src/modules/*/index.ts` | `name: 'aidd_*'` + `registerValidator(server, 'aidd_*')` |
| Schema DDL | `mcp-aidd-memory/src/storage/migrations.ts` | `SCHEMA` constant → CREATE TABLE/INDEX/TRIGGER |
| Pattern signatures | `mcp-aidd-memory/src/modules/pattern-killer/detector.ts` | `AI_PATTERN_SIGNATURES` array |
| Hook subscribers | `evolution/index.ts` + `pattern-killer/index.ts` | `hookBus.register('name')` + event type |
| Evolution detectors | `evolution/analyzer.ts` | `type: 'detector_name'` |
| Constants | `types.ts` + `evolution/index.ts` + `hooks.ts` | Named constant patterns |

## Output Files

| File | Content | Token Budget |
|------|---------|-------------|
| `index.md` | Architecture, storage, constants, checksum | ~180 |
| `mcp-map.md` | All tools grouped by package/module | ~250 |
| `sql-schema.md` | Tables, PKs, columns, indexes, triggers | ~200 |
| `pattern-signatures.md` | 12 signatures, 7 metrics, 5 audit dims | ~180 |
| `memory-handover.md` | 5 hooks, confidence tiers, detectors | ~150 |

## Checksum

SHA-256 computed over all 5 rendered files (with placeholder in index.md). Stored as `archChecksum:` in `index.md`. The `--check` flag compares computed vs stored hash.

```
Render with placeholder → SHA-256(all 5 files) → Replace placeholder → Write
```

## When Docs Go Stale

Any of these source changes invalidate the checksum:
- Adding/removing/renaming a tool (`registerTool` or `registerValidator`)
- Modifying the SQLite schema (`SCHEMA` constant in migrations.ts)
- Adding/removing pattern signatures in `detector.ts`
- Adding/removing hook subscribers (`hookBus.register`)
- Changing evolution detector types in `analyzer.ts`
- Changing constants (thresholds, intervals)

After any such change: `pnpm mcp:docs` to regenerate.

## Script

[`scripts/generate-mcp-docs.ts`](../../scripts/generate-mcp-docs.ts) — single file, ~480 lines, runs via `tsx`. No build step required. Uses only `node:fs`, `node:path`, `node:crypto`.
