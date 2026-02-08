# MCP Tool Map (70 tools)

## Core (17)
bootstrap: detect_project, get_config, **start**
knowledge: query_tkb, get_tkb_entry, get_agent, get_competency_matrix
routing: classify_task, get_routing_table, model_route, get_model_matrix, model_matrix_status
guidance: apply_heuristics, suggest_next, tech_compatibility
context: optimize_context
scaffold: scaffold

## Memory (34)
session(1): **session**(start|update|end|get|list)
branch(1): branch(get|save|promote|list|merge)
memory(8): memory_search, memory_context, memory_get, memory_add_decision, memory_add_mistake, memory_add_convention, memory_prune, memory_export
observation(1): **observation**
lifecycle(5): lifecycle_get, lifecycle_init, lifecycle_advance, lifecycle_status, lifecycle_list
analytics(3): model_performance, model_compare, model_recommend
evolution(4): evolution_analyze, evolution_status, evolution_review, evolution_revert
drafts(3): draft_create, draft_list, draft_approve
diagnostics(2): diagnose_error, project_health
pattern-killer(6): pattern_audit, pattern_list, pattern_add, pattern_stats, pattern_score, pattern_false_positive

## Tools (19)
validation(11): validate_{tkb_entry,mermaid,openapi,sql,tests,dockerfile,i18n,design_tokens}, scan_secrets, audit_{accessibility,performance}
enforcement(4): check_compliance, verify_version, check_quality_gates, explain_violation
execution(2): generate_commit_message, plan_migration
ci(2): ci_report, ci_diff_check

## Critical Paths
`start`→`session(start)`→`observation`→`memory_search`
`session(end)`→HookBus→evolution-auto-analyze→`evolution_status`
`observation`→HookBus→pattern-auto-detect→`pattern_stats`
