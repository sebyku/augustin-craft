import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Deployed at https://sebyku.github.io/augustin-craft/ so assets need the repo
// name as base in production. Dev keeps "/" for plain http://localhost:5173.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/augustin-craft/' : '/',
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})