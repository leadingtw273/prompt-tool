import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import yaml from '@modyfi/vite-plugin-yaml';
import path from 'path';

// Deployed to GitHub Pages at https://leadingtw273.github.io/prompt-tool/
// so production builds need the base path; dev server stays at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/prompt-tool/' : '/',
  plugins: [react(), yaml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
