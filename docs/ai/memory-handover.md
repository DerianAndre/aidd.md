# Memory Handover (5 Layers)

## Layer Stack
```
L5 Evolution ← analyze(sessions, patternStats) → candidates
     ↑
L4 Permanent ← memory_add_{decision,mistake,convention} | memory_export → JSON
     ↑
L3 Branch ← branch(promote) ← session data | branch(merge) → permanent
     ↑
L2 Observation ← aidd_observation → FTS5 index | discoveryTokens ROI
     ↑
L1 Session ← session(start) → session(update) → session(end) → HookBus
```

## HookBus
Events: `session_ended`(sessionId), `observation_saved`(observationId, sessionId)
Circuit breaker: 3 consecutive failures → subscriber disabled

### Subscribers (5)

| Hook | Trigger | Action |
|------|---------|--------|
| pattern-auto-detect | observation_saved | Auto-detect patterns in observation narratives |
| pattern-model-profile | session_ended | Auto-generate evolution candidates for model-specific pattern bans |
| evolution-auto-analyze | session_ended | Debounced auto-evolution analysis (every 5th session) |
| evolution-feedback-loop | session_ended | Feedback loop — adjust candidate confidence on session end |
| evolution-auto-prune | session_ended | Auto-prune stale data (every 10th session) |

## Confidence Tiers
>=90: auto-apply | 70-89: draft | <70: pending | <=20: auto-delete

## 6 Evolution Detectors
model_recommendation, new_convention, compound_workflow, skill_combo, context_efficiency, model_pattern_ban
