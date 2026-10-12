import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH is read from process.env at build time.
// import.meta.env is NOT available in vite.config.ts — process.env must be used.
//
// Vercel build (default):   npm run build
//   → base: '/'
//
// Hostinger build:          $env:VITE_BASE_PATH="/calculators/"; npm run build
//   → base: '/calculators/'
const rawBase = process.env.VITE_BASE_PATH ?? '/';
// Ensure the base path is a non-empty string; fall back safely to '/'.
const base = typeof rawBase === 'string' && rawBase.length > 0 ? rawBase : '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
  ],
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
