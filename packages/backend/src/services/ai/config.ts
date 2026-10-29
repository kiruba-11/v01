import { AIProviderConfig, AIProviderType } from './types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ai-config');

export function resolveAIConfig(purpose: 'chat' | 'embedding' = 'chat'): AIProviderConfig {
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase() as AIProviderType;
  const envModel = purpose === 'embedding'
    ? (process.env.AI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL)
    : (process.env.AI_MODEL || process.env.MODEL);

  // Explicit provider routing or auto-detection
  let provider: AIProviderType = envProvider;

  if (!provider) {
    if (process.env.OLLAMA_BASE_URL || (envModel && !process.env.OMNIROUTE_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.GEMINI_API_KEY)) {
      provider = 'ollama';
    } else if (process.env.ANTHROPIC_API_KEY) {
      provider = 'anthropic';
    } else if (process.env.OPENAI_API_KEY) {
      provider = 'openai';
    } else if (process.env.NVIDIA_API_KEY) {
      provider = 'nvidia';
    } else if (process.env.GEMINI_API_KEY) {
      provider = 'gemini';
    } else if (process.env.CUSTOM_AI_BASE_URL) {
      provider = 'openai-compatible';
    } else {
      provider = 'omniroute';
    }
  }

  switch (provider) {
    case 'ollama':
      return {
        provider: 'ollama',
        apiKey: process.env.OLLAMA_API_KEY || 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        model: envModel || (purpose === 'embedding' ? 'nomic-embed-text' : 'llama3'),
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
        model: envModel || 'claude-3-5-sonnet-20241022',
      };
    case 'openai':
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: envModel || (purpose === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o'),
      };
    case 'nvidia':
      return {
        provider: 'nvidia',
        apiKey: process.env.NVIDIA_API_KEY || '',
        baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        model: envModel || (purpose === 'embedding' ? 'nvidia/embed-qa-4' : 'nvidia/llama-3.1-nemotron-70b-instruct'),
      };
    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: envModel || (purpose === 'embedding' ? 'text-embedding-004' : 'gemini-1.5-pro'),
      };
    case 'openai-compatible':
      return {
        provider: 'openai-compatible',
        apiKey: process.env.CUSTOM_AI_API_KEY || '',
        baseUrl: process.env.CUSTOM_AI_BASE_URL || 'http://localhost:1234/v1',
        model: envModel || process.env.CUSTOM_AI_MODEL || 'default-model',
      };
    case 'omniroute':
    default:
      const omniKey = process.env.OMNIROUTE_API_KEY || process.env.OMNI_API_KEY || '';
      return {
        provider: 'omniroute',
        apiKey: omniKey,
        baseUrl: process.env.OMNIROUTE_BASE_URL || 'https://api.omniroute.ai/v1',
        model: envModel || (purpose === 'embedding' ? 'openai/text-embedding-3-small' : 'auto/best-chat'),
      };
  }
}
