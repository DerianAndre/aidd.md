import { useEffect, useRef, useCallback } from 'react';
import { startWatching, onFileChanged } from '../tauri';
import {
  AIDD_DIR, CONTENT_PATHS, STATE_PATHS, WATCHER_PREFIXES,
} from '../constants';
import { useProjectStore } from '../../stores/project-store';
import { useRulesStore } from '../../features/rules/stores/rules-store';
import { useTemplatesStore } from '../../features/templates/stores/templates-store';
import { useSkillsStore } from '../../features/skills/stores/skills-store';
import { useWorkflowsStore } from '../../features/workflows/stores/workflows-store';
import { useKnowledgeStore } from '../../features/knowledge/stores/knowledge-store';
import { useSessionsStore } from '../../features/memory/stores/sessions-store';
import { usePermanentMemoryStore } from '../../features/memory/stores/permanent-memory-store';
import { useAnalyticsStore } from '../../features/analytics/stores/analytics-store';
import { useEvolutionStore } from '../../features/evolution/stores/evolution-store';
import { useDraftsStore } from '../../features/drafts/stores/drafts-store';
import { useDiagnosticsStore } from '../../features/diagnostics/stores/diagnostics-store';
import { useConfigStore } from '../../features/config/stores/config-store';
import { useArtifactsStore } from '../../features/artifacts/stores/artifacts-store';

const DEBOUNCE_MS = 100;

// Derive flush-time prefix constants from SSOT
const P_RULES = `/${AIDD_DIR}/${CONTENT_PATHS.rules}/`;
const P_TEMPLATES = `/${AIDD_DIR}/${CONTENT_PATHS.templates}/`;
const P_SKILLS = `/${AIDD_DIR}/${CONTENT_PATHS.skills}/`;
const P_WORKFLOWS = `/${AIDD_DIR}/${CONTENT_PATHS.workflows}/`;
const P_KNOWLEDGE = `/${AIDD_DIR}/${CONTENT_PATHS.knowledge}/`;
const P_SESSIONS = `/${AIDD_DIR}/${STATE_PATHS.SESSIONS}/`;
const P_EVOLUTION = `/${AIDD_DIR}/${STATE_PATHS.EVOLUTION}/`;
const P_DRAFTS = `/${AIDD_DIR}/${STATE_PATHS.DRAFTS}/`;
const P_MEMORY = `/${AIDD_DIR}/${STATE_PATHS.MEMORY}/`;
const P_CONFIG = `/${AIDD_DIR}/${STATE_PATHS.CONFIG}`;
const P_DATA_DB = `/${AIDD_DIR}/data.db`;

/**
 * Maps path prefixes to store invalidation functions.
 * Starts the Rust file watcher for the active project and routes
 * change events to the appropriate feature store.
 */
export function useEntityWatcher() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(new Set<string>());

  // Framework entity stores
  const rulesInvalidate = useRulesStore((s) => s.invalidate);
  const templatesInvalidate = useTemplatesStore((s) => s.invalidate);
  const skillsInvalidate = useSkillsStore((s) => s.invalidate);
  const workflowsInvalidate = useWorkflowsStore((s) => s.invalidate);
  const knowledgeInvalidate = useKnowledgeStore((s) => s.invalidate);

  // Memory + intelligence stores
  const sessionsInvalidate = useSessionsStore((s) => s.invalidate);
  const permanentMemoryInvalidate = usePermanentMemoryStore((s) => s.invalidate);
  const analyticsInvalidate = useAnalyticsStore((s) => s.invalidate);
  const evolutionInvalidate = useEvolutionStore((s) => s.invalidate);
  const draftsInvalidate = useDraftsStore((s) => s.invalidate);
  const diagnosticsInvalidate = useDiagnosticsStore((s) => s.invalidate);
  const artifactsInvalidate = useArtifactsStore((s) => s.invalidate);

  // Config store
  const configInvalidate = useConfigStore((s) => s.invalidate);

  const flush = useCallback(() => {
    const prefixes = pendingRef.current;

    // Framework entities
    if (prefixes.has(P_RULES)) rulesInvalidate();
    if (prefixes.has(P_TEMPLATES)) templatesInvalidate();
    if (prefixes.has(P_SKILLS)) skillsInvalidate();
    if (prefixes.has(P_WORKFLOWS)) workflowsInvalidate();
    if (prefixes.has(P_KNOWLEDGE)) knowledgeInvalidate();

    // Session-related updates (legacy JSON sessions or SQLite db writes)
    if (prefixes.has(P_SESSIONS) || prefixes.has(P_DATA_DB)) {
      sessionsInvalidate();
      analyticsInvalidate();
      diagnosticsInvalidate();
    }

    // Evolution candidates
    if (prefixes.has(P_EVOLUTION)) evolutionInvalidate();

    // Draft artifacts
    if (prefixes.has(P_DRAFTS)) draftsInvalidate();

    // SQLite-backed state writes should refresh all memory/intelligence views.
    if (prefixes.has(P_DATA_DB)) {
      permanentMemoryInvalidate();
      evolutionInvalidate();
      draftsInvalidate();
      artifactsInvalidate();
    }

    // Permanent memory — decisions, mistakes, conventions
    if (prefixes.has(P_MEMORY)) {
      permanentMemoryInvalidate();
      diagnosticsInvalidate(); // mistakes feed into health score
    }

    // Config file
    if (prefixes.has(P_CONFIG)) configInvalidate();

    prefixes.clear();
  }, [
    rulesInvalidate, templatesInvalidate, skillsInvalidate, workflowsInvalidate, knowledgeInvalidate,
    sessionsInvalidate, permanentMemoryInvalidate, analyticsInvalidate,
    evolutionInvalidate, draftsInvalidate, diagnosticsInvalidate,
    configInvalidate, artifactsInvalidate,
  ]);

  useEffect(() => {
    if (!activeProject?.path) return;

    let unlisten: (() => void) | undefined;

    // Start the Rust file watcher on the project root
    void startWatching(activeProject.path, true);

    // Listen for change events
    onFileChanged((event) => {
      for (const filePath of event.paths) {
        const normalized = filePath.replace(/\\/g, '/');

        for (const prefix of WATCHER_PREFIXES) {
          if (normalized.includes(prefix)) {
            pendingRef.current.add(prefix);
            break;
          }
        }
      }

      // Debounce — batch rapid file events
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeProject?.path, flush]);
}
