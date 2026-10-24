import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('health');

router.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      res.json({ status: 'ready', database: 'connected' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

export default router;
