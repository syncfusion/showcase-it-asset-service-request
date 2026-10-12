import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PUBLIC_BASE_PATH = '/it-asset-service-portal/react/';
export default defineConfig({
  base: PUBLIC_BASE_PATH,
  plugins: [react()],
  // Some source files use .js (not .jsx) but contain JSX. The default
  // esbuild loader rejects JSX in .js files; explicit overrides let
  // Vite parse those files without renaming them.
  esbuild: {
    // No top-level override needed now that every JSX file has a
    // .jsx or .tsx extension. esbuild picks the correct loader per
    // extension, and `@vitejs/plugin-react` handles the JSX →
    // React.createElement transform for .jsx/.tsx.
    target: 'es2020',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Vite's dep-pre-bundling uses esbuild for both source and
      // dependencies. The remaining .js files in this project
      // (App.test.js, setupTests.js) are plain JS with no JSX, so
      // we let esbuild use its default 'js' loader for them.
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    // Keep CRA-equivalent output so the existing deploy artefacts
    // (asset-manifest.json, static/css, static/js) keep working.
    assetsDir: 'static',
    sourcemap: false,
  },
} satisfies UserConfig);
