import type { AiddModule } from '@aidd.md/mcp-shared';
import { bootstrapModule } from './bootstrap/index.js';
import { knowledgeModule } from './knowledge/index.js';
import { routingModule } from './routing/index.js';
import { guidanceModule } from './guidance/index.js';
import { contextModule } from './context/index.js';
import { scaffoldModule } from './scaffold/index.js';

/** All core modules — registered in dependency order. */
export const coreModules: AiddModule[] = [
  bootstrapModule,
  knowledgeModule,
  routingModule,
  guidanceModule,
  contextModule,
  scaffoldModule,
];
