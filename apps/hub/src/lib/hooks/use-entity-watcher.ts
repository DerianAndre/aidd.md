import { useEffect, useRef, useCallback } from 'react';
import { startWatching, onFileChanged } from '../tauri';
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

const DEBOUNCE_MS = 100;

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

  // Config store
  const configInvalidate = useConfigStore((s) => s.invalidate);

  const flush = useCallback(() => {
    const prefixes = pendingRef.current;

    // Framework entities
    if (prefixes.has('/content/rules/')) rulesInvalidate();
    if (prefixes.has('/content/templates/')) templatesInvalidate();
    if (prefixes.has('/content/skills/')) skillsInvalidate();
    if (prefixes.has('/content/workflows/')) workflowsInvalidate();
    if (prefixes.has('/content/knowledge/')) knowledgeInvalidate();

    // Memory layer — sessions + analytics + diagnostics
    if (prefixes.has('/.aidd/sessions/')) {
      sessionsInvalidate();
      analyticsInvalidate();
      diagnosticsInvalidate();
    }

    // Evolution candidates
    if (prefixes.has('/.aidd/evolution/')) evolutionInvalidate();

    // Draft artifacts
    if (prefixes.has('/.aidd/drafts/')) draftsInvalidate();

    // Permanent memory — decisions, mistakes, conventions
    if (prefixes.has('/ai/memory/')) {
      permanentMemoryInvalidate();
      diagnosticsInvalidate(); // mistakes feed into health score
    }

    // Config file
    if (prefixes.has('/.aidd/config.json')) configInvalidate();

    prefixes.clear();
  }, [
    rulesInvalidate, templatesInvalidate, skillsInvalidate, workflowsInvalidate, knowledgeInvalidate,
    sessionsInvalidate, permanentMemoryInvalidate, analyticsInvalidate,
    evolutionInvalidate, draftsInvalidate, diagnosticsInvalidate,
    configInvalidate,
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

        const prefixes = [
          '/content/rules/', '/content/templates/', '/content/skills/', '/content/workflows/', '/content/knowledge/',
          '/.aidd/sessions/', '/.aidd/evolution/', '/.aidd/drafts/',
          '/ai/memory/', '/.aidd/config.json',
        ] as const;
        for (const prefix of prefixes) {
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
