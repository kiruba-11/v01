import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseDocument } from '../services/documentParser.js';
import { createChunks } from '../services/chunking.js';
import { generateEmbedding } from '../services/embeddings.js';
import { extractYouTubeVideoId, extractYouTubeTranscript, extractYouTubeSource, extractWebArticle } from '../services/ingestion.js';
import { processVideoDeepRead } from '../services/deepRead.js';
import { detectLanguage } from '../services/language.js';
import axios from 'axios';

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
        `SELECT id, file_name, file_type, file_size, extraction_status, language, detected_language, source_status, status_reason, metadata_json, created_at, updated_at
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
    const requestedLanguage = req.body?.language || 'auto';

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
      const fileHash = crypto.createHash('sha256').update(await fs.readFile(file.path)).digest('hex');

      const insertResult = await client.query(
        `INSERT INTO sources (id, notebook_id, file_name, file_type, file_size, file_hash, extraction_status, language)
         VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7)
         RETURNING id, file_name, file_type, file_size, extraction_status, language, created_at`,
        [sourceId, notebookId, file.originalname, file.mimetype, file.size, fileHash, requestedLanguage]
      );

      const source = insertResult.rows[0];

      // Send response immediately, process document asynchronously with its own client connection
      res.status(201).json(source);

      processDocumentFileAsync(sourceId, file.path, file.mimetype, requestedLanguage);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to upload source', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to upload source' });
  }
});

// Ingest URL source
router.post('/url', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const { url, language: requestedLanguage = 'auto' } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Valid URL is required' });
      return;
    }

    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
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

      const sourceId = uuidv4();
      const insertResult = await client.query(
        `INSERT INTO sources (id, notebook_id, file_name, file_type, file_size, file_hash, extraction_status, language)
         VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7)
         RETURNING id, file_name, file_type, file_size, extraction_status, language, created_at`,
        [sourceId, notebookId, url, 'text/html', 0, uuidv4(), requestedLanguage]
      );

      const source = insertResult.rows[0];

      res.status(201).json(source);

      processUrlAsync(sourceId, url, requestedLanguage);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to ingest URL', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to ingest URL' });
  }
});

// Update source language
router.patch('/:sourceId/language', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId, sourceId } = req.params;
    const userId = (req as any).userId;
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
      res.status(400).json({ error: 'Valid language code is required' });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
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

      await client.query(
        'UPDATE sources SET language = $1, updated_at = NOW() WHERE id = $2',
        [language, sourceId]
      );

      res.json({ success: true, language });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to update source language', { error: error.message });
    res.status(500).json({ error: 'Failed to update source language' });
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
        `SELECT s.id, s.file_name, s.file_type, s.file_size, s.extraction_status, s.language, s.detected_language, s.source_status, s.status_reason, s.metadata_json, s.created_at, s.updated_at
         FROM sources s
         JOIN notebooks n ON s.notebook_id = n.id
         WHERE s.id = $1 AND s.notebook_id = $2 AND n.owner_id = $3 AND s.deleted_at IS NULL`,
        [sourceId, notebookId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      const source = result.rows[0];
      const chunksResult = await client.query(
        `SELECT chunk_index, content, location_metadata FROM source_chunks WHERE source_id = $1 AND deleted_at IS NULL ORDER BY chunk_index ASC`,
        [sourceId]
      );

      res.json({
        ...source,
        chunks: chunksResult.rows,
        fullText: chunksResult.rows.map((c: any) => c.content).join('\n\n'),
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to get source', { error: error.message });
    res.status(500).json({ error: 'Failed to get source' });
  }
});

// Bulk delete sources
router.delete('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const { sourceIds } = req.body;

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      res.status(400).json({ error: 'Array of sourceIds is required' });
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

      await client.query('BEGIN');

      for (const sourceId of sourceIds) {
        const sourceRes = await client.query(
          'SELECT id FROM sources WHERE id = $1 AND notebook_id = $2 AND deleted_at IS NULL',
          [sourceId, notebookId]
        );
        if (sourceRes.rows.length > 0) {
          await client.query('UPDATE sources SET deleted_at = NOW() WHERE id = $1', [sourceId]);
          await client.query('UPDATE source_chunks SET deleted_at = NOW() WHERE source_id = $1', [sourceId]);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, deletedCount: sourceIds.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to bulk delete sources', { error: error.message });
    res.status(500).json({ error: 'Failed to delete sources' });
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

// Helper function to process document file asynchronously with its own db client
async function processDocumentFileAsync(sourceId: string, filePath: string, mimeType: string, requestedLanguage: string) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    logger.info(`Processing document file: ${sourceId}`, { sourceId, mimeType });

    // Parse document
    const { text, metadata } = await parseDocument(filePath, mimeType);

    // Detect language
    const detected = detectLanguage(text);
    const effectiveLanguage = requestedLanguage === 'auto' ? detected.code : requestedLanguage;

    // Create chunks
    const chunks = createChunks(text, metadata, 1000, 200);

    // Store chunks with embeddings in database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let embedding: number[] = [];
      try {
        embedding = await generateEmbedding(chunk.content);
      } catch (embErr) {
        logger.warn(`Embedding generation failed for chunk ${i}`, { error: (embErr as any).message });
      }

      const vectorString = embedding.length > 0 ? `[${embedding.join(',')}]` : null;

      try {
        await client.query(
          `INSERT INTO source_chunks (id, source_id, chunk_index, content, location_metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [uuidv4(), sourceId, i, chunk.content, JSON.stringify(chunk.location || {}), vectorString]
        );
      } catch {
        // Fallback without vector cast if vector extension isn't active
        await client.query(
          `INSERT INTO source_chunks (id, source_id, chunk_index, content, location_metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), sourceId, i, chunk.content, JSON.stringify(chunk.location || {})]
        );
      }
    }

    // Update source status and language
    await client.query(
      'UPDATE sources SET extraction_status = $1, language = $2, detected_language = $3, updated_at = NOW() WHERE id = $4',
      ['completed', effectiveLanguage, detected.code, sourceId]
    );

    logger.info(`Document processing completed: ${sourceId}`, { sourceId, chunkCount: chunks.length, language: effectiveLanguage, detected: detected.code });

    // Clean up uploaded file
    await fs.unlink(filePath);
  } catch (error: any) {
    logger.error(`Document processing failed: ${sourceId}`, { sourceId, error: error.message });

    try {
      await client.query(
        'UPDATE sources SET extraction_status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', sourceId]
      );
    } catch (updateError) {
      logger.error('Failed to update source status', { error: updateError });
    }

    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.error('Failed to clean up file', { error: unlinkError });
    }
  } finally {
    client.release();
  }
}

// Helper function to process URL asynchronously
async function processUrlAsync(sourceId: string, url: string, requestedLanguage: string) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    logger.info(`Processing URL / Video: ${sourceId}`, { sourceId, url });

    let title = url;
    let text = '';
    let chunks: Array<{ content: string; location?: any }> = [];
    let sourceStatus = 'completed';
    let statusReason = 'Successfully extracted.';
    let metadataJson: string | null = null;
    const videoId = extractYouTubeVideoId(url);
    const isYouTube = videoId !== null;

    if (isYouTube) {
      try {
        if (process.env.ENABLE_DEEP_READ === 'true') {
          const deepResult = await processVideoDeepRead(url, videoId);
          title = deepResult.title;
          text = deepResult.text;
          chunks = deepResult.chunksWithMetadata;
          sourceStatus = deepResult.coverage.isMusicTrack ? 'music_track' : 'deep_read_completed';
          statusReason = `Deep read completed. Tiers run: [${deepResult.coverage.tiersRun.join(', ')}]. Skipped: [${deepResult.coverage.skippedReasons.join('; ')}].`;
          metadataJson = JSON.stringify({
            sourceType: 'youtube_deep_read',
            url,
            videoId,
            author: deepResult.channel,
            ...deepResult.coverage,
            globalSummary: deepResult.globalSummary,
            disclaimer: deepResult.disclaimer,
          });
        } else {
          const ytResult = await extractYouTubeSource(url);
          title = ytResult.title;
          text = ytResult.text;
          chunks = ytResult.chunksWithMetadata;

          sourceStatus = ytResult.status;
          statusReason = ytResult.reason;
          metadataJson = JSON.stringify(ytResult.metadata);
        }
      } catch (ytErr: any) {
        logger.warn(`YouTube ingestion failed: ${url}`, { error: ytErr.message });
        sourceStatus = 'network_error';
        statusReason = ytErr.message || 'YouTube ingestion failed.';
        text = `YouTube Video: ${title}\nURL: ${url}\nStatus: network_error\nReason: ${statusReason}`;
        chunks = createChunks(text, { sourceType: 'youtube', url, videoId }, 1000, 200);
      }
    } else {
      const webResult = await extractWebArticle(url);
      title = webResult.title;
      text = webResult.text;
      chunks = createChunks(text, webResult.metadata, 1000, 200);
      sourceStatus = 'completed';
      statusReason = 'Web article successfully extracted.';
      metadataJson = JSON.stringify(webResult.metadata);
    }

    // Detect language
    const detected = detectLanguage(text);
    const effectiveLanguage = requestedLanguage === 'auto' ? detected.code : requestedLanguage;

    // Update file_name, language, detected_language, source_status, status_reason, metadata_json
    await client.query(
      'UPDATE sources SET file_name = $1, file_type = $2, file_size = $3, language = $4, detected_language = $5, source_status = $6, status_reason = $7, metadata_json = $8, updated_at = NOW() WHERE id = $9',
      [title, isYouTube ? 'video/youtube' : 'text/html', Buffer.byteLength(text, 'utf8'), effectiveLanguage, detected.code, sourceStatus, statusReason, metadataJson, sourceId]
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let embedding: number[] = [];
      try {
        embedding = await generateEmbedding(chunk.content);
      } catch (embErr) {
        logger.warn(`Embedding generation failed for chunk ${i}`, { error: (embErr as any).message });
      }

      const vectorString = embedding.length > 0 ? `[${embedding.join(',')}]` : null;

      try {
        await client.query(
          `INSERT INTO source_chunks (id, source_id, chunk_index, content, location_metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [uuidv4(), sourceId, i, chunk.content, JSON.stringify(chunk.location || {}), vectorString]
        );
      } catch {
        await client.query(
          `INSERT INTO source_chunks (id, source_id, chunk_index, content, location_metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), sourceId, i, chunk.content, JSON.stringify(chunk.location || {})]
        );
      }
    }

    await client.query(
      'UPDATE sources SET extraction_status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', sourceId]
    );

    logger.info(`URL / Video processing completed: ${sourceId}`, { sourceId, chunkCount: chunks.length, language: effectiveLanguage, detected: detected.code });
  } catch (error: any) {
    logger.error(`URL / Video processing failed: ${sourceId}`, { sourceId, error: error.message });

    try {
      await client.query(
        'UPDATE sources SET extraction_status = $1, file_name = COALESCE(file_name, $2), updated_at = NOW() WHERE id = $3',
        ['failed', `Extraction failed: ${error.message}`, sourceId]
      );
    } catch (updateError) {
      logger.error('Failed to update source status', { error: updateError });
    }
  } finally {
    client.release();
  }
}

export default router;
