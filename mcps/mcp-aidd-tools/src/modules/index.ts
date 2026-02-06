import type { AiddModule } from '@aidd.md/mcp-shared';
import { validationModule } from './validation/index.js';
import { enforcementModule } from './enforcement/index.js';
import { executionModule } from './execution/index.js';
import { ciModule } from './ci/index.js';

/** All tools modules. */
export const toolsModules: AiddModule[] = [
  validationModule,
  enforcementModule,
  executionModule,
  ciModule,
];
