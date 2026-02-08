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
| pattern-auto-detect | observation_saved | detect patterns in narrative (>50 chars), record to pattern_detections |
| pattern-model-profile | session_ended | topPatterns(count>=5, sessions>=3) → model_pattern_ban candidate |
| evolution-auto-analyze | session_ended (every 5th) | run 7 detectors, save candidates, write insights.md + state-dump.sql |
| evolution-feedback-loop | session_ended | adjust confidence +-5/10/15 based on userFeedback |
| evolution-auto-prune | session_ended (every 10th) | pruneStaleData(30d, 1K, 50) + WAL checkpoint |

## Confidence Tiers
>=90: auto-apply | 70-89: draft | <70: pending | <=20: auto-delete

## 7 Evolution Detectors
model_recommendations, recurring_mistakes, tool_sequences, skill_combos, context_efficiency, model_drift, model_pattern_frequency
