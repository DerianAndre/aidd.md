# Plan — Hub Marketplace

> All-in-one discovery, installation, and management hub for MCP servers and AIDD content (skills, workflows, rules, templates, knowledge)

**Date**: 2026-02-06
**Status**: In Progress
**Feature**: `apps/hub/src/features/marketplace/`
**Branch**: feature/hub-marketplace

---

## Context

Add a **Marketplace** section to the Hub app — a browsable directory inspired by:
- **cursor.directory/mcp** — MCP server cards with install configs and feature lists
- **cursor.directory/rules** — Tag-based taxonomy, sidebar categories, markdown rendering
- **skills.sh** — Leaderboard table, search, trending/hot tabs, install counts, agent compatibility

Two purposes:
1. **MCP Servers** — Discover, configure, and install third-party MCP servers
2. **AIDD Content** — Discover and install skills, workflows, rules, templates, knowledge

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Name** | Marketplace | Implies full lifecycle: discover, install, manage, use |
| **Data source** | Remote registry (GitHub-hosted JSON, fetched at runtime) | Remote from day one; GitHub raw URL as initial backend, swappable to real API |
| **View modes** | Grid (cards) + List (table) | Grid for visual browsing, list for power-user scanning (skills.sh pattern) |
| **Filtering** | Client-side with URL-persisted params | Fetch full catalog once, filter locally — fast UX, shareable states |
| **Install flow** | Primary: copy-to-clipboard. Secondary: Tauri file-write "Install directly" | Both options — safe default + power-user convenience |
| **Detail routing** | `/marketplace/:type/:slug` | Clean URLs, type discriminant for conditional rendering |
| **Types** | Discriminated union (`McpServerEntry \| ContentEntry`) | Type-safe narrowing, avoids mega-interface |
| **Markdown** | Safe renderer (react-markdown or simple parser) | All markdown rendered via safe React components |

---

## Acceptance Criteria

- [ ] Marketplace page accessible via sidebar navigation under "Explore" section
- [ ] Two tabs: "MCP Servers" and "Skills & Content" with entry counts
- [ ] Grid view showing cards with name, description, author, category, install count
- [ ] List/table view as alternative with sortable columns
- [ ] Text search filtering across name, description, author, tags
- [ ] Category/type filter chips contextual to active tab
- [ ] Sort options: popular, trending, newest, alphabetical
- [ ] Detail page with full entry info, markdown content, install snippet
- [ ] Copy-to-clipboard for config JSON / CLI install commands
- [ ] "Install directly" dialog with Tauri file-write to config targets
- [ ] Remote registry fetch with graceful fallback to static seed data
- [ ] Loading skeletons and error/stale states
- [ ] URL-persisted filter state
- [ ] Responsive grid (3/2/1 columns)
- [ ] TypeScript clean (0 errors)

---

## File Tree

```
apps/hub/src/features/marketplace/
  lib/
    types.ts                     # Type definitions (entries, filters, stats, registry)
    constants.ts                 # Categories, sort options, content type metadata, registry URLs
    registry.ts                  # RegistryAPI: fetch from remote, cache locally, fallback to static
    catalog-helpers.ts           # filter(), sort(), search(), computeStats() — pure functions
  stores/
    marketplace-store.ts         # Zustand: catalog data + filters + derived state + fetch
  components/
    marketplace-card.tsx         # Card component for grid view (both MCP + Content)
    marketplace-table.tsx        # Table + rows for list view
    filter-bar.tsx               # Search + category chips + sort + view toggle
    install-snippet.tsx          # Code block with copy button (JSON config / CLI command)
    install-dialog.tsx           # Modal for "Install directly" via Tauri file-write
    tag-cloud.tsx                # Clickable tag chips with counts
    stat-cards.tsx               # Summary stats row
  pages/
    marketplace-page.tsx         # Main: tabs + filters + grid/list
    marketplace-detail-page.tsx  # Detail: info + install + markdown content
```

**15 files total** (4 lib, 1 store, 7 components, 2 pages)

---

## Registry Architecture

### Remote-First with Local Fallback

```
GitHub repo (JSON registry files)
       |
       v
registry.ts — fetchMcpRegistry() / fetchContentRegistry()
       |
       +-- Fetch from raw.githubusercontent.com/aidd-md/registry/main/*.json
       +-- Cache in Zustand store (in-memory, session-scoped)
       +-- Optional: persist to .aidd/cache/marketplace/ via Tauri for offline
       +-- Error handling: show cached/fallback data + stale badge if fetch fails
       |
       v
marketplace-store.ts — stores fetched data + manages filters
```

### Bootstrap Strategy

Since the `aidd-md/registry` repo doesn't exist yet, the registry module will:
1. Define the JSON schema and expected URLs
2. Include **fallback static data** baked into the app (used when fetch fails or repo doesn't exist)
3. The static fallback serves as seed data AND offline mode
4. Once the registry repo is created, the app auto-switches to live data

---

## Implementation Steps

| # | Task | Files | Complexity | Model | Status |
|---|------|-------|------------|-------|--------|
| 0 | Create plan doc + commit | `docs/plans/active/` | Low | — | in-progress |
| 1 | Define types + constants | `lib/types.ts`, `lib/constants.ts` | Low | Haiku | pending |
| 2 | Implement registry module | `lib/registry.ts` | Medium | Sonnet | pending |
| 3 | Implement catalog helpers | `lib/catalog-helpers.ts` | Medium | Sonnet | pending |
| 4 | Create Zustand store | `stores/marketplace-store.ts` | Medium | Sonnet | pending |
| 5 | Build MarketplaceCard | `components/marketplace-card.tsx` | Low | Sonnet | pending |
| 6 | Build MarketplaceTable | `components/marketplace-table.tsx` | Medium | Sonnet | pending |
| 7 | Build FilterBar | `components/filter-bar.tsx` | Medium | Sonnet | pending |
| 8 | Build InstallSnippet | `components/install-snippet.tsx` | Low | Haiku | pending |
| 9 | Build InstallDialog | `components/install-dialog.tsx` | Medium | Sonnet | pending |
| 10 | Build TagCloud | `components/tag-cloud.tsx` | Low | Haiku | pending |
| 11 | Build StatCards | `components/stat-cards.tsx` | Low | Haiku | pending |
| 12 | Compose MarketplacePage | `pages/marketplace-page.tsx` | High | Opus | pending |
| 13 | Compose MarketplaceDetailPage | `pages/marketplace-detail-page.tsx` | High | Opus | pending |
| 14 | Register routes + nav | `router.tsx`, `constants.ts`, `app-sidebar.tsx` | Low | Haiku | pending |
| 15 | Verify + polish | Manual testing | Medium | — | pending |

---

## Verification

1. `pnpm hub:dev` — app starts without errors
2. Navigate to `/marketplace` via sidebar
3. Loading state: skeleton grid while fetching
4. Fallback mode: stale badge when offline
5. MCP Servers tab: grid of cards, search, sort
6. Skills & Content tab: content entries, type filters
7. Toggle grid/list views
8. Click card — detail page with install snippet + markdown
9. Copy to clipboard works
10. Install directly — modal with config target selector
11. Back navigation via breadcrumbs + browser
12. Empty state on no-match search
13. Responsive grid adapts
14. URL persistence of filters
15. `pnpm --filter hub typecheck` — 0 errors
