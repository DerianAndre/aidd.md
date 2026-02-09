# MCP & Tool Mapping

## 79 Tools across 21 Modules

### core (17)
- **bootstrap**: aidd_detect_project, aidd_get_config, aidd_start
- **context**: aidd_optimize_context
- **guidance**: aidd_apply_heuristics, aidd_suggest_next, aidd_tech_compatibility
- **knowledge**: aidd_query_tkb, aidd_get_tkb_entry, aidd_get_agent, aidd_get_competency_matrix
- **routing**: aidd_classify_task, aidd_get_routing_table, aidd_model_route, aidd_get_model_matrix, aidd_model_matrix_status
- **scaffold**: aidd_scaffold

### memory (43)
- **analytics**: aidd_model_performance, aidd_model_compare, aidd_model_recommend
- **artifacts**: aidd_artifact
- **branch**: aidd_branch
- **diagnostics**: aidd_diagnose_error, aidd_project_health
- **drafts**: aidd_draft_create, aidd_draft_list, aidd_draft_approve, aidd_draft_reject
- **evolution**: aidd_evolution_analyze, aidd_evolution_status, aidd_evolution_review, aidd_evolution_revert, aidd_evolution_approve, aidd_evolution_reject, aidd_evolution_delete
- **lifecycle**: aidd_lifecycle_get, aidd_lifecycle_init, aidd_lifecycle_advance, aidd_lifecycle_status, aidd_lifecycle_list
- **memory**: aidd_memory_search, aidd_memory_context, aidd_memory_get, aidd_memory_add_decision, aidd_memory_add_mistake, aidd_memory_add_convention, aidd_memory_edit_decision, aidd_memory_edit_mistake, aidd_memory_edit_convention, aidd_memory_prune, aidd_memory_export, aidd_memory_integrity_check
- **observation**: aidd_observation
- **pattern-killer**: aidd_pattern_audit, aidd_pattern_list, aidd_pattern_add, aidd_pattern_stats, aidd_pattern_score, aidd_pattern_false_positive
- **session**: aidd_session

### tools (19)
- **ci**: aidd_ci_report, aidd_ci_diff_check
- **enforcement**: aidd_check_compliance, aidd_verify_version, aidd_check_quality_gates, aidd_explain_violation
- **execution**: aidd_generate_commit_message, aidd_plan_migration
- **validation**: aidd_validate_tkb_entry, aidd_validate_mermaid, aidd_validate_openapi, aidd_validate_sql, aidd_scan_secrets, aidd_validate_tests, aidd_validate_dockerfile, aidd_validate_i18n, aidd_audit_accessibility, aidd_audit_performance, aidd_validate_design_tokens

## Critical Paths
- Start: aidd_start → session(start) → hookBus
- Memory: observation → FTS5 → memory_search → memory_context → memory_get
- Evolution: session(end) → hookBus → analyze → candidates → draft/auto-apply
- Pattern: audit → detect+fingerprint+score → pattern_detections
