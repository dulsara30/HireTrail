import { defineConfig } from 'tsup';

/**
 * Bundles our own code into one CommonJS file that Vercel runs as a serverless function.
 * Dependencies stay external (tsup default) and are traced from node_modules by Vercel.
 */
export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'bundle',
  format: ['cjs'],
  platform: 'node',
  target: 'node22',
  splitting: false,
  sourcemap: false,
  clean: true,
  // Vercel calls the module export as the request handler: make the Express app the export itself
  footer: { js: 'module.exports = module.exports.default;' },
  // bundled: the workspace package, and ESM-only packages that a CommonJS file cannot require()
  noExternal: ['@hiretrail/shared', 'fractional-indexing', 'archiver'],
});
