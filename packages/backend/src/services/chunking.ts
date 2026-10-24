import { createLogger } from '../utils/logger.js';

const logger = createLogger('chunking');

interface Chunk {
  content: string;
  location?: Record<string, any>;
}

export function createChunks(
  text: string,
  metadata: Record<string, any>,
  chunkSize: number = 1000,
  overlap: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];

  // Split by paragraphs first to preserve semantics
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length + trimmedParagraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        location: {
          chunkIndex,
          ...metadata,
        },
      });

      // Create overlap by keeping end of previous chunk
      const overlapStart = Math.max(0, currentChunk.length - overlap);
      currentChunk = currentChunk.substring(overlapStart) + '\n\n' + trimmedParagraph;
      chunkIndex++;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += trimmedParagraph;
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      location: {
        chunkIndex,
        ...metadata,
      },
    });
  }

  logger.info(`Created ${chunks.length} chunks from document`);
  return chunks;
}
