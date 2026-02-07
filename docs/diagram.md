# Architecture Diagrams: SQLite-First Storage + Model-Aware Auto-Learning

> Mermaid diagrams for the AIDD MCP memory system.
> **Last Updated**: 2026-02-06

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "AI Client (Claude Code / Cursor)"
        AI[AI Model]
    end

    subgraph "MCP Engine Process (Node.js)"
        direction TB

        subgraph "Tool Layer"
            ST[aidd_session<br/>start · update · end]
            OT[aidd_observation]
            MT[aidd_memory_*<br/>search · context · add]
            BT[aidd_branch<br/>get · save · promote]
            ET[aidd_evolution_*<br/>analyze · status · review]
            PT[aidd_pattern_*<br/>audit · list · add · stats · score]
            LT[aidd_lifecycle_*]
            DT[aidd_drafts_*]
            AT[aidd_model_*<br/>performance · compare · recommend]
        end

        subgraph "Hook Layer"
            HB[HookBus<br/>fire-and-forget]
        end

        subgraph "Auto-Learning Layer"
            APD[Auto Pattern<br/>Detection]
            AEA[Auto Evolution<br/>Analysis]
            AFL[Auto Feedback<br/>Loop]
            AMP[Auto Model<br/>Profiling]
            AIG[Auto Insights<br/>Generation]
        end

        subgraph "Storage Layer"
            SP[StorageProvider<br/>lazy singleton]
            SB[SqliteBackend<br/>~30 methods]
            DB[(data.db<br/>SQLite + FTS5)]
        end
    end

    subgraph "Filesystem"
        INS[ai/memory/<br/>insights.md]
        JSON[ai/memory/<br/>*.json exports]
    end

    AI <-->|MCP Protocol| ST & OT & MT & BT & ET & PT & LT & DT & AT
    ST & OT -->|emit events| HB
    HB -->|session_ended| AEA & AFL & AMP & AIG
    HB -->|observation_saved| APD
    APD & AEA & AFL & AMP -->|read/write| SP
    AIG -->|write| INS
    SP --> SB --> DB
    MT -->|export| JSON
    AI -.->|reads at start| INS

    style HB fill:#f9f,stroke:#333,stroke-width:2px
    style DB fill:#bbf,stroke:#333,stroke-width:2px
    style INS fill:#bfb,stroke:#333,stroke-width:2px
    style AI fill:#fbb,stroke:#333,stroke-width:2px
```

---

## 2. Storage Schema (Entity Relationship)

```mermaid
erDiagram
    sessions {
        TEXT id PK
        TEXT branch
        TEXT status
        TEXT model_id
        TEXT started_at
        TEXT ended_at
        TEXT data "JSON blob"
    }

    observations {
        TEXT id PK
        TEXT session_id FK
        TEXT type
        TEXT title
        TEXT data "JSON blob"
        TEXT created_at
    }

    observations_fts {
        TEXT title
        TEXT content
    }

    permanent_memory {
        TEXT id PK
        TEXT type
        TEXT data "JSON blob"
        TEXT created_at
    }

    permanent_memory_fts {
        TEXT title
        TEXT content
    }

    tool_usage {
        INTEGER id PK
        TEXT session_id FK
        TEXT name
        TEXT result_quality
        TEXT timestamp
    }

    branches {
        TEXT name PK
        TEXT data "JSON blob"
        INTEGER archived
        TEXT updated_at
    }

    evolution_candidates {
        TEXT id PK
        TEXT type
        TEXT title
        REAL confidence
        TEXT model_scope
        TEXT status
        TEXT data "JSON blob"
        TEXT created_at
        TEXT updated_at
    }

    evolution_log {
        TEXT id PK
        TEXT candidate_id FK
        TEXT action
        TEXT title
        REAL confidence
        TEXT timestamp
    }

    evolution_snapshots {
        TEXT id PK
        TEXT candidate_id FK
        TEXT before_state "JSON blob"
        TEXT applied_at
    }

    drafts {
        TEXT id PK
        TEXT category
        TEXT title
        TEXT content
        TEXT status
        TEXT data "JSON blob"
        TEXT created_at
        TEXT updated_at
    }

    lifecycle_sessions {
        TEXT id PK
        TEXT session_id FK
        TEXT feature
        TEXT current_phase
        TEXT status
        TEXT phases "JSON blob"
        TEXT created_at
        TEXT updated_at
    }

    banned_patterns {
        TEXT id PK
        TEXT category
        TEXT pattern
        TEXT type
        TEXT severity
        TEXT model_scope
        TEXT origin
        INTEGER active
        INTEGER use_count
        TEXT hint
        TEXT created_at
    }

    pattern_detections {
        INTEGER id PK
        TEXT session_id FK
        TEXT model_id
        TEXT pattern_id FK
        TEXT matched_text
        TEXT context
        TEXT source
        TEXT created_at
    }

    audit_scores {
        INTEGER id PK
        TEXT session_id FK
        TEXT model_id
        TEXT input_hash
        TEXT scores "JSON blob"
        TEXT verdict
        TEXT created_at
    }

    sessions ||--o{ observations : "has"
    sessions ||--o{ tool_usage : "records"
    sessions ||--o{ lifecycle_sessions : "linked to"
    sessions ||--o{ pattern_detections : "generates"
    sessions ||--o{ audit_scores : "scored in"
    evolution_candidates ||--o{ evolution_log : "tracked by"
    evolution_candidates ||--o{ evolution_snapshots : "snapshot of"
    banned_patterns ||--o{ pattern_detections : "matched by"
```

---

## 3. Auto-Learning Data Flow

```mermaid
sequenceDiagram
    participant AI as AI Client
    participant Session as Session Module
    participant Obs as Observation Module
    participant HB as HookBus
    participant PK as Pattern Killer
    participant Evo as Evolution Engine
    participant DB as SQLite
    participant FS as ai/memory/insights.md

    Note over AI,FS: === Normal Session Flow ===

    AI->>Session: aidd_session start<br/>(model, branch, task)
    Session->>DB: saveSession()
    Session-->>AI: {id, status}

    Note over AI: AI reads insights.md<br/>from context (~150 tokens)

    loop During work
        AI->>Obs: aidd_observation<br/>(narrative, facts)
        Obs->>DB: saveObservation()
        Obs-->>AI: {id, saved}
        Obs-)HB: emit('observation_saved')

        Note over HB,DB: Silent — zero tokens

        HB->>PK: autoDetectPatterns()
        PK->>DB: listBannedPatterns()
        PK->>PK: regex scan narrative
        PK->>DB: recordPatternDetection()<br/>(modelId, matches)
    end

    AI->>Session: aidd_session end<br/>(outcome, feedback)
    Session->>Session: computeFingerprint()<br/>(pure math, free)
    Session->>Session: computeContextEfficiency()<br/>(if tokenUsage available)
    Session->>DB: saveSession()
    Session-->>AI: {id, completed}
    Session-)HB: emit('session_ended')

    Note over HB,FS: All hooks run server-side — zero AI tokens

    par Auto Evolution (every 5th session)
        HB->>Evo: autoAnalyzePatterns()
        Evo->>DB: listSessions(completed, 200)
        Evo->>Evo: 7 detectors<br/>(model recs, mistakes,<br/>tools, skills, efficiency,<br/>drift, pattern freq)
        Evo->>DB: saveEvolutionCandidates()
        Evo->>DB: appendEvolutionLog()
    and Feedback Loop
        HB->>Evo: autoProcessFeedback()
        Evo->>DB: listEvolutionCandidates(modelScope)
        Evo->>Evo: adjust confidence<br/>(±5-15 per feedback)
        Evo->>DB: updateEvolutionCandidates()
    and Model Profile
        HB->>PK: autoUpdateModelProfile()
        PK->>DB: getPatternStats(modelId)
        PK->>DB: saveEvolutionCandidate()<br/>(if threshold crossed)
    end

    HB->>Evo: writeInsightsFile()
    Evo->>DB: query top models, candidates, patterns
    Evo->>FS: write insights.md<br/>(~200 lines, compact)

    Note over AI,FS: === Next Session ===
    AI->>AI: Reads insights.md<br/>Knows: recommendations,<br/>alerts, evolution status
```

---

## 4. Token Budget Flow

```mermaid
graph LR
    subgraph "ZERO COST (Server-Side)"
        direction TB
        R[Regex Pattern<br/>Detection]
        F[Statistical<br/>Fingerprinting]
        E[Evolution<br/>Analysis]
        FB[Feedback<br/>Loop]
        I[insights.md<br/>Generation]
        S[SQLite<br/>Queries]
    end

    subgraph "AI TOKEN COST"
        direction TB
        TC1[Tool Call:<br/>aidd_session end<br/>~50 tokens response]
        TC2[Tool Call:<br/>aidd_pattern_audit<br/>~150 tokens response]
        TC3[File Read:<br/>insights.md<br/>~150 tokens in context]
    end

    subgraph "AVOIDED COST"
        direction TB
        AV1[aidd_evolution_status<br/>~300 tokens]
        AV2[aidd_pattern_stats<br/>~200 tokens]
        AV3[aidd_model_recommend<br/>~200 tokens]
    end

    TC1 -.->|triggers| R & F & E & FB & I
    I -.->|replaces| AV1 & AV2 & AV3
    TC3 -.->|reads| I

    style R fill:#bfb
    style F fill:#bfb
    style E fill:#bfb
    style FB fill:#bfb
    style I fill:#bfb
    style S fill:#bfb
    style AV1 fill:#fbb
    style AV2 fill:#fbb
    style AV3 fill:#fbb
    style TC1 fill:#ffb
    style TC2 fill:#ffb
    style TC3 fill:#ffb
```

---

## 5. Module Dependency Graph

```mermaid
graph TD
    subgraph "packages/shared"
        Types[types.ts<br/>StorageBackend interface<br/>TokenUsage, ModelFingerprint]
    end

    subgraph "mcps/mcp-aidd-memory"
        subgraph "Storage"
            SP[StorageProvider]
            SB[SqliteBackend]
            MIG[migrations.ts<br/>SCHEMA]
        end

        subgraph "Modules"
            HOOKS[hooks.ts<br/>HookBus]
            SES[session/]
            OBS[observation/]
            BR[branch/]
            MEM[memory/]
            EVO[evolution/]
            DRA[drafts/]
            LIF[lifecycle/]
            ANA[analytics/]
            DIA[diagnostics/]
            PK[pattern-killer/]
        end

        WIRE[modules/index.ts<br/>wiring]
    end

    Types --> SP & SB
    SP --> SB --> MIG
    WIRE --> SP
    WIRE --> HOOKS
    WIRE --> SES & OBS & BR & MEM & EVO & DRA & LIF & ANA & DIA & PK

    SES -->|emit| HOOKS
    OBS -->|emit| HOOKS
    HOOKS -->|handle| EVO
    HOOKS -->|handle| PK

    SES & OBS & BR & MEM & EVO & DRA & LIF & ANA & DIA & PK -->|use| SP

    style HOOKS fill:#f9f,stroke:#333
    style PK fill:#fbf,stroke:#333
    style SP fill:#bbf,stroke:#333
    style Types fill:#bfb,stroke:#333
```

---

## 6. Evolution Detector Pipeline

```mermaid
graph TD
    SESS[(Completed<br/>Sessions DB)] --> LOAD[Load last 200<br/>sessions]

    LOAD --> D1[detectModel<br/>Recommendations]
    LOAD --> D2[detectRecurring<br/>Mistakes]
    LOAD --> D3[detectTool<br/>Sequences]
    LOAD --> D4[detectSkill<br/>Combos]
    LOAD --> D5[detectContext<br/>Efficiency]
    LOAD --> D6[detectModel<br/>Drift]

    PSTATS[(Pattern<br/>Stats DB)] --> D7[detectModel<br/>PatternFrequency]

    D1 --> MERGE[Merge Candidates]
    D2 --> MERGE
    D3 --> MERGE
    D4 --> MERGE
    D5 --> MERGE
    D6 --> MERGE
    D7 --> MERGE

    MERGE --> THRESH{Confidence<br/>Threshold}

    THRESH -->|>=90%| AUTO[Auto-Applied<br/>to evolution_log]
    THRESH -->|70-89%| DRAFT[Drafted<br/>to candidates table]
    THRESH -->|<70%| PEND[Pending<br/>to candidates table]

    AUTO --> INSIGHTS[Write<br/>insights.md]
    DRAFT --> INSIGHTS
    PEND --> INSIGHTS

    style D5 fill:#ffd,stroke:#333
    style D6 fill:#ffd,stroke:#333
    style D7 fill:#ffd,stroke:#333
    style AUTO fill:#bfb,stroke:#333
    style DRAFT fill:#ffb,stroke:#333
    style PEND fill:#fbb,stroke:#333
    style INSIGHTS fill:#bfb,stroke:#333
```

---

## 7. Pattern Killer Pipeline

```mermaid
graph LR
    subgraph "Input"
        TEXT[Text to Audit]
        MODEL[Model ID]
    end

    subgraph "Detection (Zero Cost)"
        REG[Regex Scan<br/>~15 built-in patterns]
        BAN[Banned Patterns<br/>from DB]
        STAT[Statistical<br/>Fingerprinting]
    end

    subgraph "Scoring"
        LD[Lexical<br/>Diversity<br/>0-20]
        SV[Structural<br/>Variation<br/>0-20]
        VA[Voice<br/>Authenticity<br/>0-20]
        PA[Pattern<br/>Absence<br/>0-20]
        SP2[Semantic<br/>Preservation<br/>0-20]
    end

    subgraph "Output"
        TOTAL[Total Score<br/>0-100]
        VERDICT{Verdict}
        V1[pass >=70]
        V2[retry 40-69]
        V3[escalate <40]
    end

    TEXT --> REG & STAT
    MODEL --> BAN
    BAN --> REG

    REG --> PA
    STAT --> LD & SV & VA

    LD --> TOTAL
    SV --> TOTAL
    VA --> TOTAL
    PA --> TOTAL
    SP2 --> TOTAL

    TOTAL --> VERDICT
    VERDICT --> V1 & V2 & V3

    style TEXT fill:#bbf
    style REG fill:#bfb
    style STAT fill:#bfb
    style BAN fill:#bfb
    style V1 fill:#bfb
    style V2 fill:#ffb
    style V3 fill:#fbb
```

---

## 8. Before vs After: Storage Architecture

```mermaid
graph TB
    subgraph "BEFORE (Current)"
        direction TB
        B_SES[Sessions] -->|StorageBackend| B_DB[(SQLite/JSON)]
        B_OBS[Observations] -->|StorageBackend| B_DB
        B_BR[Branches] -->|Direct JSON| B_J1[.aidd/branches/*.json]
        B_EVO[Evolution] -->|Direct JSON| B_J2[.aidd/evolution/*.json]
        B_DRA[Drafts] -->|Direct JSON| B_J3[.aidd/drafts/*.md]
        B_LIF[Lifecycle] -->|Direct JSON| B_J4[.aidd/sessions/active/*.json]
        B_MEM[Permanent Memory] -->|Direct JSON| B_J5[ai/memory/*.json]
        B_MEM -->|Sync on init| B_DB
    end

    subgraph "AFTER (New)"
        direction TB
        A_ALL[All Modules] -->|StorageBackend| A_DB[(SQLite<br/>data.db<br/>15 tables<br/>FTS5 search)]
        A_MEM[Memory Module] -->|Export on demand| A_JSON[ai/memory/*.json<br/>git-friendly]
        A_EVO[Evolution Hooks] -->|Auto-generate| A_INS[ai/memory/insights.md<br/>~150 tokens]
    end

    style B_J1 fill:#fbb
    style B_J2 fill:#fbb
    style B_J3 fill:#fbb
    style B_J4 fill:#fbb
    style B_J5 fill:#ffb
    style A_DB fill:#bfb
    style A_INS fill:#bfb
    style A_JSON fill:#ffb
```
