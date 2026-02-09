import { create } from 'zustand';
import { getGovernanceConfig, upsertGovernanceConfig } from '../../../lib/tauri';
import type { AiddConfig } from '../../../lib/types';
import { DEFAULT_CONFIG } from '../../../lib/types';

function mergeConfig(partial: Record<string, unknown>): AiddConfig {
  const p = partial as Partial<AiddConfig>;
  return {
    evolution: { ...DEFAULT_CONFIG.evolution, ...p.evolution },
    memory: { ...DEFAULT_CONFIG.memory, ...p.memory },
    modelTracking: { ...DEFAULT_CONFIG.modelTracking, ...p.modelTracking },
    ci: { ...DEFAULT_CONFIG.ci, ...p.ci },
    content: { ...DEFAULT_CONFIG.content, ...p.content },
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string');
}

function validateAndNormalizeConfig(config: AiddConfig): { ok: true; value: AiddConfig } | { ok: false; error: string } {
  const overrideMode = config.content.overrideMode;
  if (overrideMode !== 'merge' && overrideMode !== 'project_only' && overrideMode !== 'bundled_only') {
    return { ok: false, error: 'Invalid override mode' };
  }

  const normalized: AiddConfig = {
    evolution: {
      enabled: boolOrDefault(config.evolution.enabled, DEFAULT_CONFIG.evolution.enabled),
      autoApplyThreshold: clamp(
        numberOrDefault(config.evolution.autoApplyThreshold, DEFAULT_CONFIG.evolution.autoApplyThreshold),
        0,
        100,
      ),
      draftThreshold: clamp(
        numberOrDefault(config.evolution.draftThreshold, DEFAULT_CONFIG.evolution.draftThreshold),
        0,
        100,
      ),
      learningPeriodSessions: clamp(
        Math.trunc(numberOrDefault(config.evolution.learningPeriodSessions, DEFAULT_CONFIG.evolution.learningPeriodSessions)),
        1,
        500,
      ),
      killSwitch: boolOrDefault(config.evolution.killSwitch, DEFAULT_CONFIG.evolution.killSwitch),
    },
    memory: {
      maxSessionHistory: clamp(
        Math.trunc(numberOrDefault(config.memory.maxSessionHistory, DEFAULT_CONFIG.memory.maxSessionHistory)),
        10,
        100000,
      ),
      autoPromoteBranchDecisions: boolOrDefault(
        config.memory.autoPromoteBranchDecisions,
        DEFAULT_CONFIG.memory.autoPromoteBranchDecisions,
      ),
      pruneAfterDays: clamp(
        Math.trunc(numberOrDefault(config.memory.pruneAfterDays, DEFAULT_CONFIG.memory.pruneAfterDays)),
        7,
        3650,
      ),
    },
    modelTracking: {
      enabled: boolOrDefault(config.modelTracking.enabled, DEFAULT_CONFIG.modelTracking.enabled),
      crossProject: boolOrDefault(config.modelTracking.crossProject, DEFAULT_CONFIG.modelTracking.crossProject),
    },
    ci: {
      blockOn: stringArray(config.ci.blockOn, DEFAULT_CONFIG.ci.blockOn),
      warnOn: stringArray(config.ci.warnOn, DEFAULT_CONFIG.ci.warnOn),
      ignore: stringArray(config.ci.ignore, DEFAULT_CONFIG.ci.ignore),
    },
    content: {
      overrideMode,
      slimStartEnabled: boolOrDefault(
        config.content.slimStartEnabled,
        DEFAULT_CONFIG.content.slimStartEnabled ?? true,
      ),
      slimStartTargetTokens: clamp(
        Math.trunc(numberOrDefault(config.content.slimStartTargetTokens, DEFAULT_CONFIG.content.slimStartTargetTokens ?? 600)),
        100,
        5000,
      ),
    },
  };

  return { ok: true, value: normalized };
}

interface ConfigStoreState {
  config: AiddConfig;
  loading: boolean;
  stale: boolean;
  saving: boolean;
  lastError: string | null;

  fetch: (projectRoot: string) => Promise<void>;
  save: (projectRoot: string, config: AiddConfig) => Promise<boolean>;
  reset: () => void;
  invalidate: () => void;
}

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  loading: false,
  stale: true,
  saving: false,
  lastError: null,

  fetch: async (_projectRoot) => {
    if (!get().stale || get().saving) return;
    set({ loading: true, lastError: null });
    try {
      const raw = await getGovernanceConfig();
      const merged = mergeConfig((raw ?? {}) as Record<string, unknown>);
      const parsed = validateAndNormalizeConfig(merged);
      if (parsed.ok) {
        set({ config: parsed.value, loading: false, stale: false });
      } else {
        set({
          config: { ...DEFAULT_CONFIG },
          loading: false,
          stale: false,
          lastError: parsed.error,
        });
      }
    } catch (error) {
      set({
        config: { ...DEFAULT_CONFIG },
        loading: false,
        stale: false,
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  save: async (_projectRoot, config) => {
    set({ saving: true, lastError: null });
    try {
      const merged = mergeConfig(config as unknown as Record<string, unknown>);
      const parsed = validateAndNormalizeConfig(merged);
      if (!parsed.ok) {
        set({
          saving: false,
          lastError: parsed.error,
        });
        return false;
      }

      await upsertGovernanceConfig(parsed.value);
      set({ config: parsed.value, saving: false, lastError: null });
      return true;
    } catch (error) {
      set({
        saving: false,
        lastError: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  },

  reset: () => set({ config: { ...DEFAULT_CONFIG }, lastError: null }),

  invalidate: () => {
    if (!get().saving) set({ stale: true });
  },
}));
