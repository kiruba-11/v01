import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { parseDocument } from '../services/documentParser.js';
import { createChunks } from '../services/chunking.js';

const router = Router({ mergeParams: true });
const logger = createLogger('sources');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads');
      try {
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err as any, '');
      }
    },
    filename: (req, file, cb) => {
      const id = uuidv4();
      cb(null, `${id}-${Date.now()}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// List sources in a notebook
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify notebook ownership
      const notebookResult = await client.query(
        'SELECT owner_id FROM notebooks WHERE id = $1 AND deleted_at IS NULL',
        [notebookId]
      );

      if (notebookResult.rows.length === 0 || notebookResult.rows[0].owner_id !== userId) {
        res.status(404).json({ error: 'Notebook not found' });
        return;
      }

      // List sources
      const result = await client.query(
        `SELECT id, file_name, file_type, file_size, extraction_status, created_at, updated_at
         FROM sources WHERE notebook_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [notebookId]
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to list sources', { error: error.message });
    res.status(500).json({ error: 'Failed to list sources' });
  }
});

// Upload a source file
router.post('/', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify notebook ownership
      const notebookResult = await client.query(
        'SELECT owner_id FROM notebooks WHERE id = $1 AND deleted_at IS NULL',
        [notebookId]
      );

      if (notebookResult.rows.length === 0 || notebookResult.rows[0].owner_id !== userId) {
        res.status(404).json({ error: 'Notebook not found' });
        return;
      }

      // Create source record
      const sourceId = uuidv4();
      const fileHash = require('crypto').createHash('sha256').update(await fs.readFile(file.path)).digest('hex');

      const insertResult = await client.query(
        `INSERT INTO sources (id, notebook_id, file_name, file_type, file_size, file_hash, extraction_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'processing')
         RETURNING id, file_name, file_type, file_size, extraction_status, created_at`,
        [sourceId, notebookId, file.originalname, file.mimetype, file.size, fileHash]
      );

      const source = insertResult.rows[0];

      // Process document asynchronously (in production, this would be a background job)
      processDocumentAsync(client, sourceId, file.path, file.mimetype, notebookId);

      res.status(201).json(source);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to upload source', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to upload source' });
  }
});

// Get source details
router.get('/:sourceId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId, sourceId } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify notebook ownership and source belongs to notebook
      const result = await client.query(
        `SELECT s.id, s.file_name, s.file_type, s.file_size, s.extraction_status, s.created_at, s.updated_at
         FROM sources s
         JOIN notebooks n ON s.notebook_id = n.id
         WHERE s.id = $1 AND s.notebook_id = $2 AND n.owner_id = $3 AND s.deleted_at IS NULL`,
        [sourceId, notebookId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to get source', { error: error.message });
    res.status(500).json({ error: 'Failed to get source' });
  }
});

// Delete source
router.delete('/:sourceId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId, sourceId } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify notebook ownership and source belongs to notebook
      const sourceResult = await client.query(
        `SELECT s.id FROM sources s
         JOIN notebooks n ON s.notebook_id = n.id
         WHERE s.id = $1 AND s.notebook_id = $2 AND n.owner_id = $3 AND s.deleted_at IS NULL`,
        [sourceId, notebookId, userId]
      );

      if (sourceResult.rows.length === 0) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      // Soft delete source and associated chunks
      await client.query('UPDATE sources SET deleted_at = NOW() WHERE id = $1', [sourceId]);
      await client.query('UPDATE source_chunks SET deleted_at = NOW() WHERE source_id = $1', [sourceId]);

      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to delete source', { error: error.message });
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Helper function to process document asynchronously
async function processDocumentAsync(client: any, sourceId: string, filePath: string, mimeType: string, notebookId: string) {
  try {
    logger.info(`Processing document: ${sourceId}`, { sourceId, mimeType });

    // Parse document
    const { text, metadata } = await parseDocument(filePath, mimeType);

    // Create chunks
    const chunks = createChunks(text, metadata, 1000, 200);

    // Store chunks in database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await client.query(
        `INSERT INTO source_chunks (id, source_id, chunk_index, content, location_metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), sourceId, i, chunk.content, JSON.stringify(chunk.location || {})]
      );
    }

    // Update source status to completed
    await client.query(
      'UPDATE sources SET extraction_status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', sourceId]
    );

    logger.info(`Document processing completed: ${sourceId}`, { sourceId, chunkCount: chunks.length });

    // Clean up uploaded file
    await fs.unlink(filePath);
  } catch (error: any) {
    logger.error(`Document processing failed: ${sourceId}`, { sourceId, error: error.message });

    // Update source status to failed
    try {
      await client.query(
        'UPDATE sources SET extraction_status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', sourceId]
      );
    } catch (updateError) {
      logger.error('Failed to update source status', { error: updateError });
    }

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.error('Failed to clean up file', { error: unlinkError });
    }
  }
}

export default router;
