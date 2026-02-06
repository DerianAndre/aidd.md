import { create, type StateCreator } from 'zustand';
import {
  listMarkdownEntities,
  readFile,
  writeFile,
  deleteFile,
  type MarkdownEntity,
} from '../lib/tauri';
import { normalizePath } from '../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal entity interface — feature stores extend this. */
export interface BaseEntity {
  /** Unique identifier — typically the normalized file path. */
  id: string;
  /** Display name (from heading, frontmatter, or filename). */
  name: string;
  /** Optional short description. */
  description: string;
  /** Normalized file path on disk. */
  path: string;
  /** Raw markdown content (body after frontmatter). */
  content: string;
  /** Parsed frontmatter key-value pairs. */
  frontmatter: Record<string, string>;
  /** ISO timestamp or Rust SystemTime string. */
  lastModified: string;
}

/** Configuration for the entity store factory. */
export interface EntityStoreConfig<T extends BaseEntity> {
  /** Base directory to scan (relative to project root). */
  basePath: string;
  /** Whether to scan recursively. */
  recursive?: boolean;
  /**
   * Transform a raw MarkdownEntity (from Rust) into your typed entity.
   * Return `null` to skip the entry.
   */
  transform: (raw: MarkdownEntity, projectRoot: string) => T | null;
  /**
   * Optional custom fetch — override the default `listMarkdownEntities` flow.
   * Use this for skills (directory-based) or agents (single-file parse).
   */
  customFetch?: (projectRoot: string) => Promise<T[]>;
}

/** Store state shape produced by the factory. */
export interface EntityStoreState<T extends BaseEntity> {
  items: T[];
  selectedItem: T | null;
  loading: boolean;
  error: string | null;
  stale: boolean;

  // Actions
  fetchAll: (projectRoot: string) => Promise<void>;
  fetchOne: (projectRoot: string, id: string) => Promise<T | null>;
  save: (projectRoot: string, entity: T, fullContent: string) => Promise<void>;
  remove: (projectRoot: string, entity: T) => Promise<void>;
  select: (item: T | null) => void;
  invalidate: () => void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a typed Zustand store for file-based markdown entities.
 *
 * Usage:
 * ```ts
 * export const useRulesStore = createEntityStore<RuleEntity>({
 *   basePath: 'rules',
 *   recursive: false,
 *   transform: (raw) => ({ ...mapFields(raw) }),
 * });
 * ```
 */
export function createEntityStore<T extends BaseEntity>(
  config: EntityStoreConfig<T>,
) {
  const storeCreator: StateCreator<EntityStoreState<T>> = (set, get) => ({
    items: [],
    selectedItem: null,
    loading: false,
    error: null,
    stale: true,

    fetchAll: async (projectRoot: string) => {
      // Skip if already loaded and not stale
      if (!get().stale && get().items.length > 0) return;

      set({ loading: true, error: null });
      try {
        let items: T[];

        if (config.customFetch) {
          items = await config.customFetch(projectRoot);
        } else {
          const fullPath = `${normalizePath(projectRoot)}/${config.basePath}`;
          const raws = await listMarkdownEntities(fullPath, config.recursive ?? false);
          items = raws
            .map((raw) => config.transform(raw, projectRoot))
            .filter((item): item is T => item !== null);
        }

        set({ items, loading: false, stale: false });
      } catch (e) {
        set({ loading: false, error: String(e) });
      }
    },

    fetchOne: async (projectRoot: string, id: string) => {
      // First check local cache
      const cached = get().items.find((item) => item.id === id);
      if (cached && !get().stale) {
        set({ selectedItem: cached });
        return cached;
      }

      // Re-fetch to get fresh data
      try {
        const content = await readFile(id);
        const raw: MarkdownEntity = {
          path: id,
          name: '',
          frontmatter: {},
          content,
          last_modified: new Date().toISOString(),
        };
        const entity = config.transform(raw, projectRoot);
        if (entity) {
          set({ selectedItem: entity });
          return entity;
        }
        return null;
      } catch (e) {
        set({ error: String(e) });
        return null;
      }
    },

    save: async (_projectRoot: string, entity: T, fullContent: string) => {
      try {
        await writeFile(entity.path, fullContent);
        // Update local cache
        set((state) => ({
          items: state.items.map((item) =>
            item.id === entity.id ? entity : item,
          ),
          selectedItem:
            state.selectedItem?.id === entity.id ? entity : state.selectedItem,
          stale: true, // Mark stale so next fetchAll refreshes
        }));
      } catch (e) {
        set({ error: String(e) });
        throw e;
      }
    },

    remove: async (_projectRoot: string, entity: T) => {
      try {
        await deleteFile(entity.path);
        set((state) => ({
          items: state.items.filter((item) => item.id !== entity.id),
          selectedItem:
            state.selectedItem?.id === entity.id ? null : state.selectedItem,
          stale: true,
        }));
      } catch (e) {
        set({ error: String(e) });
        throw e;
      }
    },

    select: (item) => set({ selectedItem: item }),

    invalidate: () => set({ stale: true }),
  });

  return create<EntityStoreState<T>>(storeCreator);
}

// ---------------------------------------------------------------------------
// Default transform helper
// ---------------------------------------------------------------------------

/**
 * Maps a raw MarkdownEntity to a BaseEntity.
 * Extracts title from `# heading` and description from `> blockquote`.
 * Suitable for rules, templates, and other simple markdown files.
 */
export function defaultTransform(raw: MarkdownEntity): BaseEntity {
  const path = normalizePath(raw.path);
  const content = raw.content;

  // Extract title from first # heading in body, fallback to name
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const name = titleMatch?.[1]?.trim() ?? raw.name;

  // Extract description from first > blockquote
  const descMatch = content.match(/^>\s*(.+)$/m);
  const description = descMatch?.[1]?.trim() ?? '';

  // Flatten frontmatter to Record<string, string>
  const frontmatter: Record<string, string> = {};
  if (raw.frontmatter && typeof raw.frontmatter === 'object') {
    for (const [k, v] of Object.entries(raw.frontmatter)) {
      frontmatter[k] = String(v);
    }
  }

  return {
    id: path,
    name,
    description,
    path,
    content,
    frontmatter,
    lastModified: raw.last_modified,
  };
}
