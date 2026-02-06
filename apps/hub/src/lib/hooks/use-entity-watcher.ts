import { useEffect, useRef, useCallback } from 'react';
import { startWatching, onFileChanged } from '../tauri';
import { useProjectStore } from '../../stores/project-store';
import { useRulesStore } from '../../features/rules/stores/rules-store';
import { useTemplatesStore } from '../../features/templates/stores/templates-store';
import { useSkillsStore } from '../../features/skills/stores/skills-store';
import { useWorkflowsStore } from '../../features/workflows/stores/workflows-store';
import { useKnowledgeStore } from '../../features/knowledge/stores/knowledge-store';

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

  const rulesInvalidate = useRulesStore((s) => s.invalidate);
  const templatesInvalidate = useTemplatesStore((s) => s.invalidate);
  const skillsInvalidate = useSkillsStore((s) => s.invalidate);
  const workflowsInvalidate = useWorkflowsStore((s) => s.invalidate);
  const knowledgeInvalidate = useKnowledgeStore((s) => s.invalidate);

  const flush = useCallback(() => {
    const prefixes = pendingRef.current;
    if (prefixes.has('/rules/')) rulesInvalidate();
    if (prefixes.has('/templates/')) templatesInvalidate();
    if (prefixes.has('/skills/')) skillsInvalidate();
    if (prefixes.has('/workflows/')) workflowsInvalidate();
    if (prefixes.has('/knowledge/')) knowledgeInvalidate();
    // AGENTS.md change — no dedicated store, but could be added
    prefixes.clear();
  }, [rulesInvalidate, templatesInvalidate, skillsInvalidate, workflowsInvalidate, knowledgeInvalidate]);

  useEffect(() => {
    if (!activeProject?.path) return;

    let unlisten: (() => void) | undefined;

    // Start the Rust file watcher on the project root
    void startWatching(activeProject.path, true);

    // Listen for change events
    onFileChanged((event) => {
      for (const filePath of event.paths) {
        const normalized = filePath.replace(/\\/g, '/');

        const prefixes = ['/rules/', '/templates/', '/skills/', '/workflows/', '/knowledge/'] as const;
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
