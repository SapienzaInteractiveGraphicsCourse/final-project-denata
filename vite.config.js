import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const GITHUB_PAGES_BASE = '/final-project-denata/';

export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : GITHUB_PAGES_BASE,
  plugins: [
    {
      name: 'copy-game-assets',
      apply: 'build',
      async closeBundle() {
        await cp(resolve('assets'), resolve('dist/assets'), {
          recursive: true
        });
      }
    }
  ]
}));
