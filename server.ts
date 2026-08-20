import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './src/server/api';
import { getDb } from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxy (Coolify, Traefik, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Standard Middlewares
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS & Security Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize SQLite database
getDb().then(() => {
  console.log('✅ KSADMIN SQLite Database initialized successfully.');
}).catch((err) => {
  console.error('❌ Failed to initialize SQLite Database:', err);
});

// Health check for Coolify / Docker / Cloud Run
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    app: 'KSADMIN',
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api', apiRouter);

// Undefined API routes return JSON 404, never index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint bulunamadı: ${req.method} ${req.originalUrl}` });
});

// Static assets from Vite build
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>KSADMIN - Build Gerekli</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>⚠️ Frontend Derlemesi (dist/) Bulunamadı</h2>
          <p>Lütfen sunucuyu başlatmadan önce <code>npm run build</code> komutunu çalıştırınız.</p>
        </body>
      </html>
    `);
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Sunucu hatası: ' + (err.message || 'Bilinmeyen hata'),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KSADMIN server running on http://0.0.0.0:${PORT}`);
});
