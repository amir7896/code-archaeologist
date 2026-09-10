import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@code-archaeologist/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@code-archaeologist/shared'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        timeout: 5_000,
        configure(proxy) {
          proxy.on('error', (error, _request, response) => {
            if ('code' in error && error.code === 'ECONNREFUSED' && response && !response.headersSent) {
              response.writeHead(503, { 'Content-Type': 'application/json' });
              response.end(JSON.stringify({ status: 'starting', service: 'api' }));
            }
          });
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom'],
      },
    },
  },
});
