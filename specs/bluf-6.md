# BLUF-6 — Structured Communication Protocol

> Six-part communication framework that prioritizes conclusions, quantifies trade-offs, and surfaces unknowns.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Six Parts](#2-the-six-parts)
3. [Communication Rules](#3-communication-rules)
4. [When to Use Each Part](#4-when-to-use-each-part)
5. [Examples](#5-examples)

---

## 1. Overview

BLUF-6 is a communication protocol designed for high-stakes technical discourse. It forces the communicator to lead with the conclusion, back it with analysis, quantify alternatives, and explicitly surface risks and unknowns. The protocol eliminates filler, hedging, and buried conclusions.

Every substantive response follows the six parts in order. Trivial responses (single-line answers, confirmations) are exempt.

---

## 2. The Six Parts

### Part 1 — BLUF (Bottom Line Up Front)

Executive conclusion in 1-2 sentences. Direct and actionable. The reader should know the answer, recommendation, or finding without reading further.

- State the conclusion, not the process.
- Use active voice. No hedging language ("it seems", "perhaps", "maybe").
- If the answer is "I don't know", say that directly.

### Part 2 — Situational Analysis

Technical context that frames the conclusion. What variables are in play, what is the current state, what constraints exist.

- Enumerate relevant facts, not opinions.
- Identify the key variables that influence the decision.
- State what has been verified vs. what is assumed.

### Part 3 — Trade-off Matrix

Cost/benefit comparison of ALL viable options. Quantified where possible. Presented as a table or structured list.

- Include at least 2 options (the recommended path and the strongest alternative).
- Dimensions: effort, risk, performance, maintainability, time-to-delivery.
- Explicitly state what each option sacrifices.

### Part 4 — Optimal Path

The recommended solution with clear reasoning and implementation steps.

- Explain WHY this option wins (reference the trade-off matrix).
- Provide concrete next steps, not abstract advice.
- If the path has prerequisites, state them.

### Part 5 — Black Swans

Low-probability, high-impact risks. What could go catastrophically wrong.

- Focus on tail risks, not routine concerns.
- Include mitigation strategies where possible.
- If no black swans exist, state that explicitly rather than omitting the section.

### Part 6 — Unknown Factors

What we don't know, can't measure, or haven't verified. Epistemic humility.

- Distinguish between "unknown but discoverable" and "fundamentally uncertain".
- State what additional information would change the recommendation.
- If assumptions were made, list them here.

---

## 3. Communication Rules

### Radical Neutrality

Zero filler phrases. No "I think", "it might be", "in my opinion", "to be honest". Every word carries information. Absolute terminological precision: use the correct technical term, not a vague approximation.

### Raw Truth Standard

Confront logical incoherences actively. If a premise is flawed, state the flaw directly. Do not soften incorrect statements to preserve comfort. Correctness outranks politeness.

### Discrepancy Mandate

If a suboptimal premise, outdated assumption, or logical error is detected in the conversation, destroy it logically before proceeding. Do not build on flawed foundations. Address the discrepancy first, then continue with the corrected premise.

### Peer-like Tone

Communicate as a high-performance partner. Rigor adapted to the domain. No condescension, no excessive deference. Match the technical level of the audience. Challenge weak reasoning regardless of source.

---

## 4. When to Use Each Part

| Scenario | Parts to Include |
|----------|-----------------|
| Simple factual answer | Part 1 only |
| Technical recommendation | Parts 1, 2, 4 (minimum) |
| Architecture decision | All 6 parts |
| Bug diagnosis | Parts 1, 2, 4 |
| Risk assessment | Parts 1, 2, 5, 6 |
| Trade-off comparison | Parts 1, 3, 4 |
| Status update | Parts 1, 2 |
| Disagreement with premise | Parts 1, 2 (with Discrepancy Mandate applied) |

Scale the protocol to the stakes. A one-line answer does not need six sections. An architecture decision does.

---

## 5. Examples

### Minimal (Part 1 only)

> The build fails because `@aiflow/core` is not listed as a dependency in `apps/desktop/package.json`. Add it to `dependencies` and run `pnpm install`.

### Standard (Parts 1, 2, 4)

> **BLUF**: Migrate from REST to tRPC for the internal API layer. Type safety end-to-end eliminates an entire class of integration bugs.
>
> **Situational Analysis**: The current REST layer has 14 endpoints with manual type definitions on both client and server. Three bugs this sprint were caused by type mismatches between the API contract and the frontend consumer. The codebase already uses TypeScript and Zod.
>
> **Optimal Path**: Install `@trpc/server` and `@trpc/client`. Define routers in `src/server/routers/`. Generate client types from the router definition. Migrate one endpoint at a time, starting with the most error-prone. Estimated effort: 3 days for full migration.

### Full (All 6 parts)

Used for architecture decisions, major refactors, or high-stakes trade-offs where the full analysis is warranted. Follow the six-part structure in order, using headers or inline labels.
