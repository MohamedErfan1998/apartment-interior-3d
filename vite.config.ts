import { defineConfig } from 'vite';

// GitHub Pages serves the site under https://<user>.github.io/<repository>/ — every asset URL must start with the repository name.
// Override with BASE_PATH=/ for a user site or a custom domain.
const base = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BASE_PATH ?? '/apartment-interior-3d/';

export default defineConfig({
  base,
  build: {
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5173 },
});
