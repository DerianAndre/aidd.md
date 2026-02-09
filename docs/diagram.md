# ESP-1 Architecture and Delivery Diagrams

## 1) Target Control-Plane Architecture

```mermaid
flowchart LR
    subgraph Client["AI Client / IDE"]
        A1["aidd_start"]
        A2["aidd_session"]
        A3["aidd_evolution_analyze"]
    end

    subgraph Engine["mcp-aidd-engine"]
        C["Core Modules"]
        M["Memory Modules"]
        T["Tools Modules"]
    end

    subgraph Policy["Unified Policy Layer"]
        P1["Fast-Track Policy\n(classifier -> session -> hooks)"]
        P2["Promotion Policy\n(promoteCandidate + shadow gate)"]
        P3["Docs S2D Policy\n(generator + checksum gate)"]
    end

    subgraph Storage["SQLite + Meta"]
        S1["schema_version"]
        S2["versioned migrations"]
        S3["composite indexes"]
        S4["FTS5 + triggers"]
    end

    subgraph Reliability["HookBus Reliability"]
        H1["retry + backoff"]
        H2["dead-letter log"]
        H3["subscriber health telemetry"]
    end

    subgraph CI["CI Gates"]
        G1["typecheck + build"]
        G2["mcp:docs:check"]
        G3["control-plane tests"]
    end

    A1 --> C
    A2 --> M
    A3 --> M

    C --> P1
    M --> P2
    T --> P3

    P1 --> S1
    P2 --> S1
    P3 --> G2

    M --> S2
    M --> S3
    M --> S4
    M --> H1
    M --> H2
    M --> H3

    G1 --> Engine
    G2 --> Engine
    G3 --> Engine
```

## 2) Startup and Migration Sequence

```mermaid
sequenceDiagram
    autonumber
    participant IDE as AI Client/IDE
    participant ENG as mcp-aidd-engine
    participant MEM as storage-coordinator
    participant DB as SQLite
    participant MOD as MCP Modules

    IDE->>ENG: start server / call aidd_start
    ENG->>MEM: initialize storage
    MEM->>DB: read meta.schema_version
    alt pending migrations
        MEM->>DB: begin transaction
        MEM->>DB: apply migration N..latest
        MEM->>DB: update schema_version
        MEM->>DB: commit
    else no pending migrations
        MEM-->>ENG: schema ready
    end
    alt migration failure
        MEM-->>ENG: hard failure + actionable error
        ENG-->>IDE: startup error (no tool execution)
    else success
        ENG->>MOD: run onReady hooks
        ENG-->>IDE: aidd_start response
    end
```

## 3) Pattern Candidate Promotion Gate

```mermaid
flowchart TD
    I1["Candidate Source\n(manual analyze / auto analyze / pattern profile)"] --> G0["promoteCandidate()"]
    G0 --> T1{"type == model_pattern_ban?"}

    T1 -- No --> SAVE["save candidate + log action"]
    T1 -- Yes --> S1["run shadowTestPattern()"]
    S1 --> T2{"sample size >= threshold?"}
    T2 -- No --> AP["auto-pass with metadata\n(insufficient sample)"]
    T2 -- Yes --> T3{"falsePositiveRate <= limit?"}

    T3 -- Yes --> SAVE2["save + mark shadowTested=true\npersist rate and sample"]
    T3 -- No --> REJ["reject + cooldown log\n(optional candidate delete)"]

    AP --> SAVE2
```

## 4) Delivery Timeline (Milestones)

```mermaid
gantt
    title ESP-1 Delivery Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d

    section M1 Integrity Foundation
    W1 Storage migrations              :m1a, 2026-02-10, 6d
    W7 Migration tests                 :m1b, after m1a, 2d

    section M2 Governance Lockdown
    W2 Promotion centralization        :m2a, 2026-02-18, 5d
    W3 Fast-track unification          :m2b, after m2a, 4d

    section M3 Docs and Reliability
    W4 S2D parity hardening            :m3a, 2026-02-26, 3d
    W5 HookBus resilience              :m3b, after m3a, 4d

    section M4 Performance and Hardening
    W6 Query/index optimization        :m4a, 2026-03-05, 4d
    W7 Control-plane test baseline     :m4b, after m4a, 3d
```
