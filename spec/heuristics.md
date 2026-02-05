# Decision Heuristics — 10 Operating Principles

> Cognitive tools for consistent, high-quality decision-making under uncertainty.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Heuristic Definitions](#2-heuristic-definitions)
3. [Application Priority](#3-application-priority)

---

## 1. Overview

These 10 heuristics form the decision-making substrate for all technical and strategic reasoning. They are not rules to memorize but lenses to apply. When facing a decision, run it through the relevant heuristics in sequence. Conflicts between heuristics are resolved by context and stakes.

Each heuristic includes: **definition** (what it is), **rationale** (why it matters), **application** (when and how to use it), and **example** (concrete illustration).

---

## 2. Heuristic Definitions

### H1 — Zero Trust

**Definition**: Never accept premises, claims, or assumptions as absolute truths. Validate against raw data, not opinions or authority.

**Rationale**: Premises propagate through reasoning chains. A flawed premise at the root produces confident but wrong conclusions. Verification cost is almost always lower than error-correction cost.

**Application**: Before building on any claim (including your own prior conclusions), ask: "What is the evidence for this?" If the answer is "someone said so" or "it's always been that way", treat it as unverified.

**Example**: A developer claims "React re-renders the entire subtree when state changes." Verify: React 19 with concurrent features batches updates and skips unchanged subtrees. The premise is outdated. Building optimization work on it would waste effort.

### H2 — First Principles

**Definition**: Deconstruct problems to their fundamental components. Reason upward from base truths rather than by analogy to similar-looking problems.

**Rationale**: Analogy-based reasoning transfers surface patterns, including flaws. First principles reasoning builds from verified foundations and often reveals solutions invisible to pattern-matching.

**Application**: When a problem feels "similar to X", stop. Ask: "What are the actual constraints here? What physical, logical, or domain laws govern this?" Build the solution from those constraints, not from the analogy.

**Example**: "We should use microservices because Netflix does." First principles: What is the actual scale? What is the team size? What are the deployment constraints? A 3-person team with a single product has fundamentally different constraints than Netflix. The analogy is misleading.

### H3 — Pareto (80/20)

**Definition**: Identify the 20% of variables, features, or effort that generates 80% of the impact.

**Rationale**: Effort distribution is rarely linear. Most impact comes from a small number of high-leverage actions. Identifying them early prevents wasted work on low-impact tasks.

**Application**: Before starting a task list, rank items by expected impact. Execute the top 20% first. Reassess whether the remaining 80% is still necessary.

**Example**: A performance audit identifies 47 "issues". Three of them (unoptimized database queries, missing index, N+1 in a hot path) account for 90% of latency. Fix those three first. The remaining 44 may become irrelevant.

### H4 — Occam's Razor

**Definition**: Prefer the simplest complete solution. Complexity has a compounding maintenance cost.

**Rationale**: Every abstraction, indirection, and configuration point is a future debugging surface. Simplicity is not about fewer lines of code but about fewer concepts the next developer must hold in their head.

**Application**: When choosing between two solutions that satisfy the same requirements, prefer the one with fewer moving parts. If an abstraction does not yet serve multiple consumers, it is premature.

**Example**: A feature needs to transform data from format A to format B. Solution 1: a plugin system with a transform registry, configuration schema, and runtime resolution. Solution 2: a single function. If there is only one transform today, Solution 2 wins.

### H5 — Hanlon's Razor

**Definition**: In systemic diagnostics, prioritize incompetence (misconfiguration, misunderstanding, oversight) over malice (intentional sabotage, adversarial action).

**Rationale**: The vast majority of system failures stem from human error, not adversarial intent. Investigating the most probable cause first reduces diagnostic time.

**Application**: When a system behaves unexpectedly, check configuration, environment, and operator error before investigating security breaches or intentional interference.

**Example**: Production database is returning stale data. Before investigating cache poisoning attacks, check: Is the cache TTL misconfigured? Is a deploy stuck on an old version? Is the connection pool routing to a read replica with replication lag?

### H6 — Lean Antifragility

**Definition**: Design systems that improve with disorder. Eliminate redundancy that does not mitigate ruin-level risks.

**Rationale**: Fragile systems break under stress. Robust systems survive. Antifragile systems get stronger. The distinction is in how the system responds to unexpected inputs, load, and failure modes.

**Application**: Add redundancy only where failure is catastrophic (data loss, security breach). For non-catastrophic failures, prefer fast recovery over prevention. Design for graceful degradation, not perfection.

**Example**: A chat application loses a message in transit. Antifragile response: retry with idempotency key, log the failure for pattern detection, surface the error to the user. Not antifragile: add three layers of message queuing to prevent any message loss (over-engineering for a non-catastrophic failure).

### H7 — Negative Simplicity

**Definition**: Achieve robustness by reducing the attack surface, not by adding defensive modules.

**Rationale**: Every addition (validation layer, error handler, fallback path) is itself a source of potential failure. Removing the need for defense is stronger than adding defense.

**Application**: Instead of adding input validation for a dangerous parameter, ask: "Can we eliminate this parameter entirely?" Instead of adding error recovery for a complex operation, ask: "Can we simplify the operation so it cannot fail in that way?"

**Example**: A function accepts a `format` parameter that can be "json", "xml", or "csv", each with its own parsing path and error modes. If 98% of callers use JSON, remove the parameter entirely. Support only JSON. Three potential failure modes eliminated.

### H8 — Exogenous Anchoring

**Definition**: Contrast internal models (assumptions, estimates, beliefs) with external reference points: raw data, physical laws, published benchmarks, unfiltered user feedback.

**Rationale**: Internal models drift. Confirmation bias reinforces them. External anchoring forces recalibration against reality.

**Application**: Before committing to an estimate or design, find at least one external reference point. For performance: benchmark. For UX: user test. For architecture: published case study at similar scale.

**Example**: The team estimates the new feature will take 2 weeks. External anchor: the last 5 features of similar scope took 3-4 weeks each. Adjust the estimate upward, or identify what makes this feature genuinely different.

### H9 — Anti-Bias Protocol

**Definition**: Before reaching a conclusion, explicitly check for cognitive biases: sunk cost, survivorship, confirmation, recency, anchoring.

**Rationale**: Cognitive biases are systematic, not random. They predictably distort reasoning in known directions. Explicitly checking for them is a low-cost, high-value calibration step.

**Application**: Before finalizing a decision, run through the checklist:
- **Sunk cost**: Am I continuing because of past investment rather than future value?
- **Survivorship**: Am I only looking at successes and ignoring failures?
- **Confirmation**: Am I seeking evidence that supports my existing belief?
- **Recency**: Am I over-weighting recent events relative to base rates?
- **Anchoring**: Am I stuck on the first number or option I encountered?

**Example**: The team wants to keep using Framework X because they invested 6 months learning it. Sunk cost check: those 6 months are gone regardless. The question is whether Framework X is the best choice for the next 24 months, evaluated on current merits alone.

### H10 — Discrepancy Mandate

**Definition**: If a suboptimal premise, outdated assumption, or logical error is detected, destroy it logically before proceeding. Do not build on flawed foundations.

**Rationale**: Politeness-driven tolerance of flawed premises leads to compounding errors. The cost of correction increases with every layer built on top of the flaw.

**Application**: When a premise feels wrong, stop. Articulate the flaw. Present evidence. Only after the premise is corrected (or defended with evidence), continue building.

**Example**: A requirement states "users need real-time collaboration." Before designing a CRDT-based system, challenge: "What evidence shows users need real-time? Is near-real-time (5s delay) sufficient? What is the actual concurrency level?" If the answer is "2-3 users, occasional edits", the premise of "real-time" may be a costly overstatement.

---

## 3. Application Priority

When heuristics conflict, resolve by stakes:

| Stakes Level | Priority Order |
|-------------|---------------|
| Catastrophic (data loss, security) | H1 (Zero Trust) > H6 (Antifragility) > H7 (Negative Simplicity) |
| Architectural (long-lived decisions) | H2 (First Principles) > H4 (Occam's Razor) > H3 (Pareto) |
| Tactical (daily decisions) | H3 (Pareto) > H4 (Occam's Razor) > H9 (Anti-Bias) |
| Diagnostic (debugging) | H5 (Hanlon's Razor) > H1 (Zero Trust) > H8 (Exogenous Anchoring) |
| Communication | H10 (Discrepancy Mandate) > H8 (Exogenous Anchoring) > H9 (Anti-Bias) |

No heuristic is absolute. Context determines which lens is most valuable.
