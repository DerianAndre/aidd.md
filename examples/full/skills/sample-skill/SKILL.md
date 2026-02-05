---
name: sample-skill
description: Example skill demonstrating the AIDD skill format
model: claude-claude-sonnet-4-5-4-5
---

# Sample Skill

> Demonstrates the expected structure for an AIDD skill definition.

## When to Use

This skill is activated when the Orchestrator identifies a task matching its description. The `model` field in the frontmatter indicates the recommended model tier.

## Instructions

1. Receive delegated task from the Orchestrator
2. Validate inputs against expected parameters
3. Execute the specialized capability
4. Return structured output to the calling role

## Optional Scripts

Place validation or utility scripts in `scripts/` adjacent to this file:

```
skills/sample-skill/
    |-- SKILL.md
    \-- scripts/
        \-- validate.ts
```
