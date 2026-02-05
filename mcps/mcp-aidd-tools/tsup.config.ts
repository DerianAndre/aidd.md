import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/modules/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
