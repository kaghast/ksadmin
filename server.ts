import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './src/server/api';
import { getDb } from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize SQLite database
getDb().then(() => {
  console.log('✅ KSADMIN SQLite Database initialized successfully.');
}).catch((err) => {
  console.error('❌ Failed to initialize SQLite Database:', err);
});

// API Routes
app.use('/api', apiRouter);

// Health check for Coolify / Docker / Cloud Run
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'KSADMIN' });
});

// Static assets from Vite build
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 KSADMIN server running on http://0.0.0.0:${PORT}`);
});
