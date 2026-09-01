// Bundles the package into a single flat CJS file. A single file (instead of
// tsc's normal one-file-per-module CJS output) sidesteps a real Rollup
// limitation: `vite build`'s CommonJS→ESM interop cannot statically resolve
// named exports through multiple levels of `export * from './x'` re-export
// barrels, which this package uses heavily (index -> schemas/index -> each
// schema file). Bundling collapses all of that into flat `exports.X = ...`
// assignments that both Node's `require()` (the NestJS backend) and Vite's
// production build (the two frontends) can resolve without ambiguity.
import { build } from 'esbuild';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['zod'],
  sourcemap: true,
};

// CJS build: what Node (the NestJS backend, via `require()`) loads — "main".
await build({ ...shared, outfile: 'dist/index.js', format: 'cjs' });

// ESM build: real `export { ... }` statements, which Vite/Rollup's static
// export analysis (used by `vite build` for the two frontends) resolves
// cleanly — unlike esbuild's CJS output, which re-exports via a dynamic
// getter loop that Rollup's CJS interop can't statically see through.
// Exposed via the "module" field, which bundlers prefer over "main".
await build({ ...shared, outfile: 'dist/index.mjs', format: 'esm' });
