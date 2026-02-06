# Status Indicators — Claude Code Hook Template

> Configure Claude Code hooks to automatically emit AIDD status indicators during orchestration.

**Last Updated**: 2026-02-06
**Status**: Reference

---

## Overview

AIDD uses structured status indicators to provide situational awareness during orchestration. These indicators follow the format:

```
[aidd.md] <Category> - <Action> <target>
```

The full indicator catalog is defined in `rules/orchestrator.md` Section 6.

---

## Hook Configuration

Claude Code hooks can be configured in `.claude/settings.json` or project-level `.claude.json` to automatically emit indicators when specific tool patterns are detected.

### Example: Pre-Tool Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "command": "echo '[aidd.md] Rule - Loading context'"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "command": "echo '[aidd.md] Agent - Subagent dispatched'"
      }
    ]
  }
}
```

### Recommended Hooks

| Hook Event | Matcher | Indicator |
|---|---|---|
| PreToolUse | `Read` (when path matches `rules/`) | `[aidd.md] Rule - Applied <filename>` |
| PreToolUse | `Read` (when path matches `spec/`) | `[aidd.md] Spec - Using <filename>` |
| PreToolUse | `Read` (when path matches `templates/`) | `[aidd.md] Template - Loaded <filename>` |
| PreToolUse | `Read` (when path matches `skills/`) | `[aidd.md] Agent - <skill-name>` |
| PreToolUse | `Task` | `[aidd.md] Orchestrator - Dispatching subagent` |

---

## Manual Emission

When hooks are not configured, the orchestrator LLM should emit indicators manually based on the rules in `rules/orchestrator.md`. The indicators are informational — they help the user track what the AI is doing without interrupting the workflow.

### Best Practices

1. Emit at the START of each significant action
2. One indicator per line
3. Skip indicators for trivial/mechanical operations
4. Use the exact format from the catalog — no variations

---

## Cross-References

- **Indicator catalog**: `rules/orchestrator.md` Section 6
- **ASDD phase indicators**: `spec/asdd-lifecycle.md` (per-phase)
- **Architect mode stage indicators**: `workflows/orchestrators/architect-mode.md` (per-stage)
- **Claude Code hooks docs**: https://docs.anthropic.com/en/docs/claude-code/hooks
