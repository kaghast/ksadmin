import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import { defineConfig, Plugin } from 'vite';
import { apiRouter } from './src/server/api';
import { getDb } from './src/server/db';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'ksadmin-api-dev-server',
    configureServer(server) {
      getDb().then(() => {
        console.log('✅ [Dev Server] KSADMIN SQLite Database initialized.');
      }).catch((err) => {
        console.error('❌ [Dev Server] Failed to initialize SQLite:', err);
      });

      const app = express();
      app.use(express.json());
      app.use('/api', apiRouter);

      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          app(req as any, res as any, next);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
