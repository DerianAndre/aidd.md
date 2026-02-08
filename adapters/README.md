# AIDD Adapters

> IDE and tool integration guides for the AIDD framework

**Last Updated**: 2026-02-08
**Status**: Reference

---

## Overview

AIDD adapters bridge the framework with specific AI-powered development tools. Each adapter documents how the tool discovers AIDD context, which integration layers are available, and what configuration is needed.

### Integration Layers

AIDD provides three integration layers. Not all tools support all layers:

| Layer | Description | Files |
|-------|-------------|-------|
| **Context** | Tool reads AIDD files for agent roles, rules, and knowledge | `AGENTS.md`, `content/` |
| **Protocol** | Tool follows a structured conversation lifecycle | `CLAUDE.md`, adapter-specific config |
| **MCP** | Tool calls AIDD tools for sessions, memory, validation, evolution | `@aidd.md/mcp-engine` (71 tools) |

### Adapter Comparison

| Feature | Claude Code | Cursor | Gemini | Warp |
|---------|-------------|--------|--------|------|
| Context loading | `CLAUDE.md` + `AGENTS.md` | `.cursor/rules/` + `AGENTS.md` | `AGENTS.md` (native) | `AGENTS.md` (manual) |
| MCP support | Full (71 tools) | Full (71 tools) | Partial (API-level) | No |
| Hooks/automation | 4 hooks (command) | Rules auto-apply | Auto-load | Manual |
| Session tracking | Full lifecycle | Via MCP | Via MCP | No |
| Memory persistence | 3-layer (obs → permanent → export) | Via MCP | Via MCP | No |
| Status line | Custom Node.js script | Built-in | N/A | N/A |
| Configuration | `.claude/settings.json` | `.cursor/rules/` symlink | Zero-config | `AGENTS.md` paste |

---

## Adapters

### [Claude Code](claude/README.md)

Full integration with 3-layer enforcement: `CLAUDE.md` protocol + `.claude/settings.json` hooks + MCP server. Supports session lifecycle, memory persistence, pattern detection, evolution, and automated compliance enforcement via hooks.

### [Cursor](cursor/README.md)

Rules-based integration via `.cursor/rules/` symlink to `content/rules/`. MCP support for session tracking and memory. Context loading through `AGENTS.md`.

### [Gemini](gemini/README.md)

Zero-configuration context loading — Antigravity natively auto-loads `AGENTS.md`. MCP integration available when using Gemini through API or compatible tooling. System prompt injection for direct API usage.

### [Warp](warp/README.md)

Context-only integration via `AGENTS.md` content. No native MCP support. Best suited for teams using Warp as a terminal alongside an MCP-capable editor.

---

## Adding a New Adapter

1. Create `adapters/<tool-name>/README.md`
2. Document which integration layers the tool supports (Context, Protocol, MCP)
3. Provide setup instructions specific to the tool
4. Reference `AGENTS.md` as the SSOT for agent context
5. If the tool supports MCP, document the engine server configuration
6. Add the adapter to the comparison table above

---

## Cross-References

- **Framework Spec**: `content/specs/aidd-lifecycle.md`
- **Agent Hierarchy**: `content/agents/routing.md`
- **MCP Architecture**: `mcps/README.md`
- **User Guide**: `WORKFLOW.md`
