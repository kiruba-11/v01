import { createLogger } from '../utils/logger.js';
import { generateEmbedding } from './embeddings.js';
import { callChatCompletion } from './ai/index.js';

const logger = createLogger('rag');

export interface Citation {
  sourceId: string;
  fileName: string;
  snippet: string;
  location?: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function searchRelevantChunks(client: any, notebookId: string, query: string, limit = 6): Promise<any[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    let rows: any[] = [];

    // Try vector similarity search if pgvector extension is available
    try {
      const result = await client.query(
        `SELECT sc.id, sc.source_id, sc.content, sc.location_metadata, s.file_name, s.file_type, s.extraction_status,
                (1 - (sc.embedding <=> $1::vector)) AS similarity
         FROM source_chunks sc
         JOIN sources s ON sc.source_id = s.id
         WHERE s.notebook_id = $2 AND s.deleted_at IS NULL AND sc.deleted_at IS NULL AND sc.embedding IS NOT NULL
         ORDER BY sc.embedding <=> $1::vector ASC
         LIMIT $3`,
        [vectorString, notebookId, limit]
      );

      if (result.rows.length > 0) {
        rows = result.rows;
      }
    } catch (vecErr) {
      logger.debug('Vector index query failed, falling back to text search', { error: (vecErr as any).message });
    }

    // Fallback: If vector search yields no rows, try keyword ILIKE search on content
    if (rows.length === 0) {
      const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
      if (keywords.length > 0) {
        const keywordClauses = keywords.map((_, i) => `sc.content ILIKE $${i + 3}`).join(' OR ');
        try {
          const kwResult = await client.query(
            `SELECT sc.id, sc.source_id, sc.content, sc.location_metadata, s.file_name, s.file_type, s.extraction_status, 0.8 AS similarity
             FROM source_chunks sc
             JOIN sources s ON sc.source_id = s.id
             WHERE s.notebook_id = $1 AND s.deleted_at IS NULL AND sc.deleted_at IS NULL AND (${keywordClauses})
             LIMIT $2`,
            [notebookId, limit, ...keywords.map(kw => `%${kw}%`)]
          );
          if (kwResult.rows.length > 0) {
            rows = kwResult.rows;
          }
        } catch (kwErr) {
          logger.debug('Keyword search fallback failed', { error: (kwErr as any).message });
        }
      }
    }

    // Ultimate fallback search if embeddings are null or pgvector not active or no vector/keyword results
    if (rows.length === 0) {
      const fallbackResult = await client.query(
        `SELECT sc.id, sc.source_id, sc.content, sc.location_metadata, s.file_name, s.file_type, s.extraction_status, 1.0 AS similarity
         FROM source_chunks sc
         JOIN sources s ON sc.source_id = s.id
         WHERE s.notebook_id = $2 AND s.deleted_at IS NULL AND sc.deleted_at IS NULL
         LIMIT $1`,
        [limit, notebookId]
      );
      rows = fallbackResult.rows;
    }

    // Deduplicate chunks by content and source_id
    const seenContent = new Set<string>();
    const deduplicated = rows.filter(row => {
      const key = `${row.source_id}:${row.content.trim()}`;
      if (seenContent.has(key)) {
        return false;
      }
      seenContent.add(key);
      return true;
    });

    return deduplicated;
  } catch (error: any) {
    logger.error('Failed to search relevant chunks', { error: error.message });
    return [];
  }
}

export async function generateRagAnswer(
  query: string,
  contextChunks: any[],
  history: ChatMessage[] = []
): Promise<{ answer: string; citations: Citation[] }> {
  const citations: Citation[] = contextChunks.map((chunk, idx) => {
    let locStr = '';
    if (chunk.location_metadata?.formattedTimestamp) {
      locStr = ` [Timestamp: ${chunk.location_metadata.formattedTimestamp}]`;
    } else if (chunk.location_metadata?.page) {
      locStr = ` [Page: ${chunk.location_metadata.page}]`;
    }
    return {
      sourceId: chunk.source_id,
      fileName: (chunk.file_name || `Source ${idx + 1}`) + locStr,
      snippet: chunk.content.slice(0, 250) + (chunk.content.length > 250 ? '...' : ''),
      location: chunk.location_metadata,
    };
  });

  const contextText = contextChunks
    .map((c, i) => {
      const locHeader = c.location_metadata?.formattedTimestamp
        ? ` (Timestamp: ${c.location_metadata.formattedTimestamp})`
        : '';
      return `[Source ${i + 1}: ${c.file_name}${locHeader}]\n${c.content}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `You are SourcePilot, an expert AI research assistant. Your task is to answer the user's question accurately, comprehensively, and directly using ONLY the provided source context below.

Guidelines:
1. Answer the user's question directly first. Support overviews, summaries, explanations, comparisons, key points, and 5W1H (Who, What, When, Where, Why, How).
2. Include precise inline citations referencing the source numbers (e.g. [1], [2]) when stating facts from the sources. If a source has a timestamp or page, incorporate it naturally.
3. If sources contain video descriptions, titles, metadata, or partial information, synthesize what is available to provide a helpful summary or answer based on the title, channel/author, and description. Never give canned refusals or claim you cannot watch videos when video metadata and descriptions are provided.
4. Maintain continuity with previous conversation turns when answering follow-up questions.
5. If the user's question is completely unrelated to the sources or asks for general knowledge not contained in the sources, state clearly that the sources do not contain information to answer the question, and do not fabricate facts.

Context Sources:
${contextText}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // include up to 10 recent conversation turns for history awareness
    { role: 'user', content: query },
  ];

  try {
    const answer = await callChatCompletion(messages, { temperature: 0.2, maxTokens: 1500 });
    return { answer: answer || 'Unable to generate response.', citations };
  } catch (error: any) {
    logger.warn('AI provider completion failed in RAG, using fallback snippet generator', { error: error.message });
    let answer = '';
    if (contextChunks.length > 0) {
      const snippets = contextChunks.map(c => `From "${c.file_name}": ${c.content.slice(0, 400)}`).join('\n\n');
      answer = `Based on the provided sources in your notebook regarding "${query}":\n\n${snippets}\n\n**Key takeaways:**\n- The retrieved source evidence addresses aspects of your research query.\n- Consulted sources: ${citations.map(c => c.fileName).join(', ')}`;
    } else {
      answer = `I searched your notebook sources for "${query}", but no relevant content or matching chunks were found. Please add relevant sources or refine your question.`;
    }
    return { answer, citations };
  }
}
