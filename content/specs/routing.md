# Specs — Routing Index

> Quick reference for AIDD standard specifications. Specs define the formal protocols, schemas, and reference material that govern the framework.

---

## Decision Table

| File | Purpose | Use When |
|------|---------|----------|
| [aidd-lifecycle.md](aidd-lifecycle.md) | 6-phase development lifecycle (spec-before-implementation), tier transitions, quality gates | Understanding the ASDD lifecycle phases, dispatch strategy, or phase transition rules |
| [bluf-6.md](bluf-6.md) | Structured communication protocol: Bottom Line, Situation, Trade-offs, Path, Black Swans, Unknowns | Formatting agent responses, presenting recommendations, or communicating decisions |
| [heuristics.md](heuristics.md) | 10 operating principles: Zero Trust, First Principles, Pareto, Occam's Razor, and more | Making technical decisions under uncertainty, resolving conflicting options |
| [memory-layer.md](memory-layer.md) | Project memory integration: decisions, mistakes, and conventions persisted across sessions | Configuring memory storage, understanding the `ai/memory/` schema, or session threading |
| [version-protocol.md](version-protocol.md) | 4-step stack validation: detect, load context, verify docs, anti-legacy filter | Before generating any code — prevents targeting deprecated or non-existent APIs |
| [supported-agents.md](supported-agents.md) | Agent/editor registry: configuration paths, skill loading, detection methods, MCP support | Adding a new AI agent, configuring editor integration, or checking compatibility |
| [model-matrix.md](model-matrix.md) | Model routing SSOT: tier definitions, provider registry, cognitive profiles, fallback chains | Selecting models for tasks, understanding tier assignments, or configuring routing |

---

## Cross-References

| Spec | Related Rules | Related Workflows |
|------|--------------|-------------------|
| aidd-lifecycle | orchestrator | orchestrator, full-stack-feature |
| bluf-6 | global (communication) | all workflows (response format) |
| heuristics | global (philosophy) | orchestrator (decision gates) |
| memory-layer | — | orchestrator (context loading) |
| version-protocol | code-style, frontend, backend | full-stack-feature (Step 0) |
| supported-agents | — | — |
| model-matrix | orchestrator (tier dispatch) | orchestrator, full-stack-feature, analyze |
