import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { SessionSummary, ObservationEntry, EvolutionStatus, PatternStats } from '../types';

interface MemoryStoreState {
  // Data
  sessionSummary: SessionSummary | null;
  observations: ObservationEntry[];
  evolutionStatus: EvolutionStatus | null;
  patternStats: PatternStats | null;

  // State
  loading: boolean;
  stale: boolean;
  error: string | null;
  lastFetch: string | null;

  // Actions
  fetch: (forceRefresh?: boolean) => Promise<void>;
  invalidate: () => void;
  searchObservations: () => Promise<ObservationEntry[]>;
  clearError: () => void;
}

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
  sessionSummary: null,
  observations: [],
  evolutionStatus: null,
  patternStats: null,

  loading: false,
  stale: true,
  error: null,
  lastFetch: null,

  fetch: async (forceRefresh = false) => {
    const state = get();

    // Skip if recent fetch and not forced
    if (!forceRefresh && !state.stale && state.lastFetch) {
      const lastFetchTime = new Date(state.lastFetch).getTime();
      const now = new Date().getTime();
      if (now - lastFetchTime < 60000) {
        // 60 second cache
        return;
      }
    }

    set({ loading: true, error: null });

    try {
      // Call Tauri commands to fetch data from the backend
      const [sessionSummary, evolutionStatus, patternStats] = await Promise.all([
        invoke<SessionSummary>('get_sessions').catch(() => ({
          total: 0,
          active: 0,
          completed: 0,
          recent_sessions: [],
        })),
        invoke<EvolutionStatus>('get_evolution_status').catch(() => ({
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          auto_applied_count: 0,
        })),
        invoke<PatternStats>('get_pattern_stats').catch(() => ({
          total_patterns: 0,
          active_patterns: 0,
          total_detections: 0,
          false_positives: 0,
        })),
      ]);

      const now = new Date().toISOString();

      set({
        sessionSummary,
        observations: [],
        evolutionStatus,
        patternStats,
        loading: false,
        stale: false,
        lastFetch: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch memory data';
      set({
        loading: false,
        error: message,
      });
    }
  },

  invalidate: () => set({ stale: true }),

  searchObservations: async () => {
    set({ loading: true, error: null });

    try {
      // TODO: Implement MCP search_observations call
      // For now, return empty array
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      set({ error: message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
