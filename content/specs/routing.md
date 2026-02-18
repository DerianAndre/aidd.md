# Specs — Routing Index

> Quick reference for AIDD standard specifications. Specs define the formal protocols, schemas, and reference material that govern the framework.

---

## Decision Table

| File | Purpose | Use When |
|------|---------|----------|
| [aidd-lifecycle.md](aidd-lifecycle.md) | 6-phase development lifecycle (spec-before-implementation), tier transitions, quality gates | Understanding the AIDD lifecycle phases, dispatch strategy, or phase transition rules |
| [bluf-6.md](bluf-6.md) | Structured communication protocol: Bottom Line, Situation, Trade-offs, Path, Black Swans, Unknowns | Formatting agent responses, presenting recommendations, or communicating decisions |
| [heuristics.md](heuristics.md) | 10 operating principles: Zero Trust, First Principles, Pareto, Occam's Razor, and more | Making technical decisions under uncertainty, resolving conflicting options |
| [memory-layer.md](memory-layer.md) | Project memory integration: decisions, mistakes, and conventions persisted across sessions | Configuring memory storage, understanding the `.aidd/memory/` schema, or session threading |
| [version-protocol.md](version-protocol.md) | 4-step stack validation: detect, load context, verify docs, anti-legacy filter | Before generating any code — prevents targeting deprecated or non-existent APIs |
| [supported-agents.md](supported-agents.md) | Agent/editor registry: configuration paths, skill loading, detection methods, MCP support | Adding a new AI agent, configuring editor integration, or checking compatibility |
| [model-matrix.md](model-matrix.md) | Model routing SSOT: tier definitions, provider registry, cognitive profiles, fallback chains | Selecting models for tasks, understanding tier assignments, or configuring routing |
| [orchestrator.md](orchestrator.md) | Workflow orchestrator specification: standards for multi-agent workflow orchestration | Creating or modifying workflow orchestrators, defining orchestrator standards |
| [fast-track.md](fast-track.md) | Per-phase workflow skip for trivial tasks that don't need full ceremony | Configuring fast-track classification, understanding skippable stages |
| [implementation-summary.md](implementation-summary.md) | Structured completion report produced at end of every SHIP phase | Writing session summaries, understanding the SHIP phase output format |
| [ltum-aidd.md](ltum-aidd.md) | Low Token Usage Mode: metadata-first development with explicit reset gates | Reducing token consumption, operating in constrained contexts |
| [prompt-evolution.md](prompt-evolution.md) | Feedback-driven prompt refinement via the AIDD evolution engine | Understanding prompt optimization, configuring evolution candidates |

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
| orchestrator | orchestrator | orchestrator, full-stack-feature |
| fast-track | orchestrator | orchestrator |
| implementation-summary | — | orchestrator (SHIP phase) |
| ltum-aidd | global (token budget) | orchestrator |
| prompt-evolution | — | orchestrator (evolution) |
