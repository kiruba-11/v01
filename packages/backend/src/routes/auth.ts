import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();
const logger = createLogger('auth');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Check if user exists
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
      if (existing.rows.length > 0) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [data.email, passwordHash, data.name || '']
      );

      const user = result.rows[0];

      // Generate token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '7d',
      });

      res.json({ user, token });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Registration error', { error: error.message });
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Find user
      const result = await client.query('SELECT id, password_hash, email, name FROM users WHERE email = $1', [data.email]);
      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = result.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(data.password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '7d',
      });

      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    res.status(400).json({ error: error.message || 'Login failed' });
  }
});

export default router;
