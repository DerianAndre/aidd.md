/**
 * Integration adapters — public API.
 * Backward-compatible re-exports for commands/integrate.ts.
 */
export type { IntegrationTool, IntegrationResult, IntegrationConfig, IntegrationStatus } from './types.js';
export { ALL_TOOLS } from './types.js';
export { IntegrationService } from './service.js';
export { detectDevMode } from './shared.js';
export type { ToolAdapter } from './shared.js';

// ── Backward-compatible function API ─────────────────────────────────────────
// Used by commands/integrate.ts: { integrate, integrateAll, listTools }

import { IntegrationService } from './service.js';

const defaultService = new IntegrationService();

export const integrate = defaultService.integrate.bind(defaultService);
export const integrateAll = defaultService.integrateAll.bind(defaultService);
export const listTools = defaultService.listTools.bind(defaultService);
