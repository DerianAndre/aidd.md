import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import { StorageProvider } from '../storage/index.js';
import { findMemoryDir } from './memory/permanent-memory.js';
import { createSessionModule } from './session/index.js';
import { createBranchModule } from './branch/index.js';
import { createMemoryModule } from './memory/index.js';
import { createObservationModule } from './observation/index.js';
import { createLifecycleModule } from './lifecycle/index.js';
import { createAnalyticsModule } from './analytics/index.js';
import { createEvolutionModule } from './evolution/index.js';
import { createDraftsModule } from './drafts/index.js';
import { createDiagnosticsModule } from './diagnostics/index.js';
import { createPatternKillerModule } from './pattern-killer/index.js';
import { createArtifactsModule } from './artifacts/index.js';

// ---------------------------------------------------------------------------
// Storage coordination
// ---------------------------------------------------------------------------

const provider = new StorageProvider();

const storageCoordinator: AiddModule = {
  name: 'storage-coordinator',
  description: 'Storage lifecycle manager — configures and initializes the storage backend',

  register(_server, context: ModuleContext) {
    provider.setConfig({
      projectRoot: context.projectRoot,
      aiddDir: context.aiddDir,
      memoryDir: findMemoryDir(context.projectRoot),
    });
  },

  async onReady() {
    await provider.getBackend();
  },
};

// ---------------------------------------------------------------------------
// All memory modules
// ---------------------------------------------------------------------------

export const memoryModules: AiddModule[] = [
  storageCoordinator,
  createSessionModule(provider),
  createBranchModule(provider),
  createMemoryModule(provider),
  createObservationModule(provider),
  createLifecycleModule(provider),
  // Phase 4-5: Evolution Engine + Diagnostics
  createAnalyticsModule(provider),
  createEvolutionModule(provider),
  createDraftsModule(provider),
  createDiagnosticsModule(provider),
  // Pattern Killer
  createPatternKillerModule(provider),
  // Artifacts
  createArtifactsModule(provider),
];
