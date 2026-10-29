import { AIProviderConfig, AIProviderType } from './types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ai-config');

export function resolveAIConfig(purpose: 'chat' | 'embedding' = 'chat'): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'openai-compatible').toLowerCase() as AIProviderType;
  const envModel = purpose === 'embedding'
    ? (process.env.AI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL)
    : (process.env.AI_MODEL || process.env.MODEL);

  const apiKey = process.env.AI_API_KEY || process.env.API_KEY || '';
  const baseUrl = process.env.AI_BASE_URL || process.env.BASE_URL;

  switch (provider) {
    case 'ollama':
      return {
        provider: 'ollama',
        apiKey: apiKey || process.env.OLLAMA_API_KEY || 'ollama',
        baseUrl: baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        model: envModel || process.env.OLLAMA_MODEL || (purpose === 'embedding' ? 'nomic-embed-text' : 'llama3'),
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY || '',
        baseUrl: baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
        model: envModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      };
    case 'openai':
      return {
        provider: 'openai',
        apiKey: apiKey || process.env.OPENAI_API_KEY || '',
        baseUrl: baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: envModel || process.env.OPENAI_MODEL || (purpose === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o'),
      };
    case 'nvidia':
      return {
        provider: 'nvidia',
        apiKey: apiKey || process.env.NVIDIA_API_KEY || '',
        baseUrl: baseUrl || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        model: envModel || process.env.NVIDIA_MODEL || (purpose === 'embedding' ? 'nvidia/embed-qa-4' : 'nvidia/llama-3.1-nemotron-70b-instruct'),
      };
    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: apiKey || process.env.GEMINI_API_KEY || '',
        baseUrl: baseUrl || process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: envModel || process.env.GEMINI_MODEL || (purpose === 'embedding' ? 'text-embedding-004' : 'gemini-1.5-pro'),
      };
    case 'omniroute':
      return {
        provider: 'omniroute',
        apiKey: apiKey || process.env.OMNIROUTE_API_KEY || process.env.OMNI_API_KEY || '',
        baseUrl: baseUrl || process.env.OMNIROUTE_BASE_URL || 'https://api.omniroute.ai/v1',
        model: envModel || process.env.OMNIROUTE_MODEL || (purpose === 'embedding' ? 'openai/text-embedding-3-small' : 'auto/best-chat'),
      };
    case 'openai-compatible':
    default:
      return {
        provider: 'openai-compatible',
        apiKey: apiKey || process.env.CUSTOM_AI_API_KEY || '',
        baseUrl: baseUrl || process.env.CUSTOM_AI_BASE_URL || 'http://localhost:11434/v1',
        model: envModel || process.env.CUSTOM_AI_MODEL || (purpose === 'embedding' ? 'nomic-embed-text' : 'llama3'),
      };
  }
}
