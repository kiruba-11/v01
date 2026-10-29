import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { searchRelevantChunks, generateRagAnswer, ChatMessage } from '../services/rag.js';

const router = Router({ mergeParams: true });
const logger = createLogger('chat');

// List conversations in a notebook
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT c.id, c.title, c.created_at, c.updated_at
         FROM conversations c
         JOIN notebooks n ON c.notebook_id = n.id
         WHERE c.notebook_id = $1 AND n.owner_id = $2
         ORDER BY c.updated_at DESC`,
        [notebookId, userId]
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to list conversations', { error: error.message });
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Create a new conversation
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const { title } = req.body;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const convoId = uuidv4();
      const result = await client.query(
        `INSERT INTO conversations (id, notebook_id, user_id, title)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title, created_at, updated_at`,
        [convoId, notebookId, userId, title || 'New Research Chat']
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to create conversation', { error: error.message });
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId, conversationId } = req.params;
    const userId = (req as any).userId;
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify access
      const convoCheck = await client.query(
        `SELECT c.id FROM conversations c
         JOIN notebooks n ON c.notebook_id = n.id
         WHERE c.id = $1 AND c.notebook_id = $2 AND n.owner_id = $3`,
        [conversationId, notebookId, userId]
      );

      if (convoCheck.rows.length === 0) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const messagesResult = await client.query(
        `SELECT id, role, content, citations, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );

      res.json(messagesResult.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to get messages', { error: error.message });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message to conversation (RAG Q&A)
router.post('/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId, conversationId } = req.params;
    const userId = (req as any).userId;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify conversation ownership
      const convoCheck = await client.query(
        `SELECT c.id FROM conversations c
         JOIN notebooks n ON c.notebook_id = n.id
         WHERE c.id = $1 AND c.notebook_id = $2 AND n.owner_id = $3`,
        [conversationId, notebookId, userId]
      );

      if (convoCheck.rows.length === 0) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Fetch conversation history before saving the new user message
      const historyResult = await client.query(
        `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
      );
      const history: ChatMessage[] = historyResult.rows.map(r => ({ role: r.role, content: r.content }));

      // Save user message
      const userMsgId = uuidv4();
      await client.query(
        `INSERT INTO messages (id, conversation_id, role, content)
         VALUES ($1, $2, 'user', $3)`,
        [userMsgId, conversationId, content]
      );

      // Search relevant chunks for RAG
      const relevantChunks = await searchRelevantChunks(client, notebookId, content, 6);

      // Generate RAG answer using conversation history and relevant chunks
      const { answer, citations } = await generateRagAnswer(content, relevantChunks, history);

      // Save assistant response
      const assistantMsgId = uuidv4();
      const assistantResult = await client.query(
        `INSERT INTO messages (id, conversation_id, role, content, citations)
         VALUES ($1, $2, 'assistant', $3, $4)
         RETURNING id, role, content, citations, created_at`,
        [assistantMsgId, conversationId, answer, JSON.stringify(citations)]
      );

      // Update conversation timestamp
      await client.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

      res.status(201).json(assistantResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to send message', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;
