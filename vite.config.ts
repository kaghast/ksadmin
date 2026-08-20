import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import { defineConfig, Plugin } from 'vite';
import { apiRouter } from './src/server/api';
import { getDb } from './src/server/db';

function apiDevServerPlugin(): Plugin {
  const setupApi = (middlewares: any, label: string) => {
    getDb().then(() => {
      console.log(`✅ [${label}] KSADMIN SQLite Database initialized.`);
    }).catch((err) => {
      console.error(`❌ [${label}] Failed to initialize SQLite:`, err);
    });

    const app = express();
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true, limit: '25mb' }));
    app.use('/api', apiRouter);

    middlewares.use((req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api')) {
        app(req, res, next);
      } else {
        next();
      }
    });
  };

  return {
    name: 'ksadmin-api-dev-server',
    configureServer(server) {
      setupApi(server.middlewares, 'Dev Server');
    },
    configurePreviewServer(server) {
      setupApi(server.middlewares, 'Preview Server');
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
