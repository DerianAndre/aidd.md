# AIDD Workflow — User Guide

> How the AI-Driven Development framework works — tool and AI agnostic

**Last Updated**: 2026-02-08
**Status**: Reference

---

## 1. What is AIDD

AIDD (AI-Driven Development) is a framework that structures how AI assistants develop software. It provides:

- **Mandatory workflow pipeline** — Every session follows Brainstorm → Plan → Execute → Test → Review → Ship with artifacts at every step
- **Session tracking** — Every conversation is a tracked development session with decisions, errors, and outcomes
- **Memory persistence** — Learnings from past sessions inform future work (decisions, mistakes, conventions)
- **Quality enforcement** — Automated validation, pattern detection, and compliance checks
- **Self-improvement** — The framework evolves based on usage patterns and outcomes

AIDD works with any AI-powered development tool that supports the MCP protocol (Claude Code, Cursor, Gemini, etc.).

---

## 2. The Workflow

Every session follows a structured pipeline. If you have something in mind start by New session name: <your_idea>.
Artifacts (versioned documents) are created at every step and session state is updated throughout.

```
Your Request → Brainstorm → Plan → [Approved?] → Execute → Test → [Pass?] → Review → [Approved?] → Ship
```

### Pipeline Diagram

```mermaid
flowchart LR
    A[Your Request] --> B[Brainstorm]
    B --> C[Plan]
    C --> D{Approved?}
    D -- Yes --> E[Execute]
    D -- No --> B
    E --> F[Test]
    F -- Fail --> E
    F -- Pass --> G{Review}
    G -- Approved --> H[Ship]
    G -- Rejected --> B

    style B fill:#e6a23c,color:#fff,stroke:#e6a23c
    style C fill:#f56c6c,color:#fff,stroke:#f56c6c
    style D fill:#67c23a,color:#fff,stroke:#67c23a
    style E fill:#409eff,color:#fff,stroke:#409eff
    style F fill:#5c6bc0,color:#fff,stroke:#5c6bc0
    style G fill:#9c27b0,color:#fff,stroke:#9c27b0
    style H fill:#26a69a,color:#fff,stroke:#26a69a
```

### Artifact Flow

```mermaid
flowchart TD
    subgraph UNDERSTAND
        B1[brainstorm]
        B2[research]
    end
    subgraph PLAN
        P1[plan]
        P2[adr]
        P3[diagram]
        P4[spec]
    end
    subgraph BUILD
        E1[issue]
    end
    subgraph TEST
        T1[checklist]
    end
    subgraph SHIP
        S1[retro]
    end

    B1 --> P1
    B2 --> P1
    P1 -. if arch decision .-> P2
    P1 -. if visual needed .-> P3
    P1 -- approved --> P4
    P1 -- approved --> E1
    E1 --> T1
    T1 --> S1
```

### Step by Step

| Step              | What Happens                                                | What You See                                   |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| **1. Startup**    | Session initialized, memory loaded                          | Conversation begins                            |
| **2. Brainstorm** | Memory searched, options explored, trade-offs considered    | Ideas, options, and trade-offs presented       |
| **3. Plan**       | Plan mode entered, detailed task plan created               | You review and approve/reject the plan         |
| **4. Execute**    | Approved plan implemented                                   | Code changes, file edits                       |
| **5. Test**       | Typecheck, tests, build run; verification checklist created | Results of automated checks                    |
| **6. Review**     | Final approval — you confirm the work is complete           | You approve to ship or reject to re-brainstorm |
| **7. Ship**       | Learnings recorded, retrospective created, session closed   | Summary of work done                           |

### Skipping Steps

The brainstorm and planning steps are mandatory by default. To skip them, say any of these explicitly:

- "Skip brainstorm"
- "Just implement this"
- "No planning needed"

Artifacts are still created for the steps that do execute.

### Iteration Loops

The pipeline has three feedback loops:

1. **Plan rejected** — You explain what needs to change. The conversation returns to brainstorming to re-explore ideas, then a revised plan is created. You can iterate as many times as needed.
2. **Tests fail** — The implementation is fixed and tests are re-run until they pass. This loop is automated.
3. **Review rejected** — After tests pass, you do a final review. If the work doesn't meet your expectations, the conversation returns to brainstorming for a fresh approach.

Each iteration is tracked for compliance scoring.

---

## 3. Artifacts

Artifacts are versioned documents created at each workflow step. They capture thinking, decisions, and results.

| Type           | Created During      | What It Contains                               |
| -------------- | ------------------- | ---------------------------------------------- |
| **Brainstorm** | Understanding       | Ideas, options, trade-offs explored            |
| **Research**   | Understanding       | Technical investigation findings               |
| **Plan**       | Planning            | Task decomposition and approach                |
| **ADR**        | Planning            | Architecture decision with reasoning           |
| **Diagram**    | Planning            | System/component/flow diagrams                 |
| **Spec**       | After plan approval | Formal specification with acceptance criteria  |
| **Issue**      | Execution           | Bugs, blockers, problems discovered            |
| **Checklist**  | Test                | Verification steps and automated check results |
| **Retro**      | Ship                | What worked, what didn't, lessons learned      |

All artifacts are stored in the project's `.aidd/` database and can be viewed in the Hub app.

---

## 4. Memory

AIDD remembers across conversations through three layers:

### What Gets Remembered

- **Decisions** — Why something was built a certain way (e.g., "Chose SQLite over PostgreSQL for local-first storage")
- **Mistakes** — Errors and how to prevent them (e.g., "Must rebuild shared package before core can resolve new imports")
- **Conventions** — Project-specific rules discovered (e.g., "All hook scripts use .cjs extension for CommonJS compatibility")

### How It Works

```mermaid
flowchart LR
    subgraph Session
        O[Observations]
    end
    subgraph Permanent
        D[Decisions]
        M[Mistakes]
        C[Conventions]
    end
    subgraph Git
        DJ[decisions.json]
        MJ[mistakes.json]
        CJ[conventions.json]
    end

    O -- promote --> D
    O -- promote --> M
    O -- promote --> C
    D -- export --> DJ
    M -- export --> MJ
    C -- export --> CJ
    D -- searched before planning --> O
    M -- searched before planning --> O
    C -- searched before planning --> O
```

1. During a session, observations are recorded (learnings, decisions, patterns)
2. At session end, significant observations are promoted to permanent memory
3. In future sessions, memory is searched before planning to avoid repeating mistakes and follow established conventions
4. Memory can be exported to JSON files for Git visibility (`decisions.json`, `mistakes.json`, `conventions.json`)

---

## 5. Sessions

Every conversation is a tracked session with:

- **Name** — What your intention is to do 
- **Input** — Your initial request (refined after brainstorming)
- **Tasks** — Pending and completed work items
- **Files** — All files modified during the session
- **Decisions** — Choices made with reasoning
- **Errors** — Problems encountered and how they were resolved
- **Token telemetry** — Input/output token counts captured at session updates/end for cost and output-density tracking
- **Outcome** — Tests passing, compliance score, reverts, reworks, your feedback

Sessions provide continuity. If a conversation is compacted or resumed, session state is recovered automatically.

---

## 6. Getting Best Results

1. **Be specific** — The more context you provide upfront, the better the brainstorm and plan will be.

2. **Engage with the brainstorm** — Add your own ideas or constraints during the exploration phase. You know the domain best.

3. **Review plans carefully** — Approve, reject with feedback, or request changes. First-try approvals indicate good alignment.

4. **Skip when appropriate** — For trivial changes or when you know exactly what you want, say "skip brainstorm" to go straight to implementation.

5. **Trust the memory** — When a past decision or convention is referenced, it came from a previous session's recorded memory.

6. **Give feedback** — At session end, feedback (positive/neutral/negative) drives framework evolution.

---

## 7. Evolution

AIDD improves itself based on usage patterns. This happens automatically:

- **Pattern detection** — After every observation, output is scanned for recurring anti-patterns (filler phrases, hedging, verbosity)
- **Model profiling** — At session end, a fingerprint is computed measuring writing style metrics (sentence length, vocabulary diversity, passive voice ratio)
- **Evolution candidates** — Every 5th session, the framework analyzes patterns across sessions and proposes improvements (new rules, conventions, workflow tweaks)
- **Feedback loop** — Your session feedback (positive/neutral/negative) adjusts the confidence of proposed changes

You don't need to do anything for evolution to work. It runs server-side at zero token cost. Over time, the framework adapts to your project's patterns and your preferences.

---

## 8. File Structure

```
.aidd/                    Project AIDD state
├── config.json           Framework configuration
├── data.db               SQLite database (sessions, memory, artifacts)
├── memory/               Exported memory (committed to Git)
│   ├── decisions.json    Architecture decisions
│   ├── mistakes.json     Errors and fixes
│   └── conventions.json  Project conventions
└── state/                Runtime state (gitignored)
    ├── insights.md       Auto-generated dashboard
    └── state-dump.sql    SQL state for debugging
```

---

## 9. Cross-References

- **AIDD Lifecycle Spec**: `content/specs/aidd-lifecycle.md`
- **Memory Layer Spec**: `content/specs/memory-layer.md`
- **Adapters**: `adapters/README.md` (Claude Code, Cursor, Gemini, Warp)
- **MCP Architecture**: `mcps/README.md`
