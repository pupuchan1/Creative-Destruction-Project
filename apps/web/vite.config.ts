import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default defineConfig({
  plugins: [react()],
  server: { headers, strictPort: true, port: 5173 },
  preview: {
    headers: {
      ...headers,
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
    strictPort: true,
    port: 4173,
  },
  build: { sourcemap: false },
});
