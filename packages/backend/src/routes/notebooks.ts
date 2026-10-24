import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const logger = createLogger('notebooks');

const createNotebookSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id, name, description, created_at, updated_at FROM notebooks WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC',
        [userId]
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to list notebooks', { error: error.message });
    res.status(500).json({ error: 'Failed to list notebooks' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = createNotebookSchema.parse(req.body);
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      const notebookId = uuidv4();
      const result = await client.query(
        'INSERT INTO notebooks (id, owner_id, name, description) VALUES ($1, $2, $3, $4) RETURNING id, name, description, created_at, updated_at',
        [notebookId, userId, data.name, data.description || '']
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to create notebook', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to create notebook' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id, name, description, created_at, updated_at FROM notebooks WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Notebook not found' });
        return;
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to get notebook', { error: error.message });
    res.status(500).json({ error: 'Failed to get notebook' });
  }
});

export default router;
