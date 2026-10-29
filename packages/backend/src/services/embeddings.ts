import { createLogger } from '../utils/logger.js';
import { generateEmbedding as unifiedGenerateEmbedding } from './ai/index.js';

const logger = createLogger('embeddings');

export async function generateEmbedding(text: string): Promise<number[]> {
  return unifiedGenerateEmbedding(text);
}
