import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - try all possible locations for .env.local and .env
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../../.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envPaths) {
  const result = config({ path: envPath });
  if (!result.error) {
    console.log(`✅ Loaded env from: ${envPath}`);
  }
}
config(); // fallback

console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'not set');
console.log('AI_MODEL:', process.env.AI_MODEL || 'not set');
console.log('OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

import { initializeDatabase } from './db/init.js';
import { createLogger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import notebookRoutes from './routes/notebooks.js';
import healthRoutes from './routes/health.js';
import sourcesRoutes from './routes/sources.js';
import chatRoutes from './routes/chat.js';
import studioRoutes from './routes/studio.js';

const logger = createLogger('app');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/notebooks/:notebookId/sources', sourcesRoutes);
app.use('/api/notebooks/:notebookId/chat', chatRoutes);
app.use('/api/notebooks/:notebookId/studio', studioRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    logger.info('Database initialized');

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error?.message || String(error),
      stack: error?.stack,
      fullError: error
    });
    console.error('Full error:', error);
    process.exit(1);
  }
}

start();
