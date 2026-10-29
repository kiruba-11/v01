import { createLogger } from '../utils/logger.js';

const logger = createLogger('ai-provider');

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerName: string;
}

/**
  * Resolves the active AI provider configuration strictly from environment variables.
  */
export function getAIProviderConfig(purpose: 'chat' | 'embedding' | 'vision' = 'chat'): AIProviderConfig {
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase();

  if (envProvider === 'ollama') {
    return {
      apiKey: process.env.OLLAMA_API_KEY || process.env.AI_API_KEY || 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL || 'http://localhost:11434/v1',
      model: purpose === 'embedding'
        ? (process.env.AI_EMBEDDING_MODEL || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text')
        : (process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'llama3'),
      providerName: 'Ollama (Local)',
    };
  }

  if (envProvider === 'anthropic') {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.ANTHROPIC_BASE_URL || process.env.AI_BASE_URL || 'https://api.anthropic.com/v1',
      model: process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
      providerName: 'Anthropic Claude',
    };
  }

  if (envProvider === 'openai') {
    return {
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      model: purpose === 'embedding'
        ? (process.env.OPENAI_EMBEDDING_MODEL || process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small')
        : (process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o'),
      providerName: 'OpenAI',
    };
  }

  if (envProvider === 'nvidia') {
    return {
      apiKey: process.env.NVIDIA_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.NVIDIA_BASE_URL || process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      model: purpose === 'embedding'
        ? (process.env.NVIDIA_EMBEDDING_MODEL || process.env.AI_EMBEDDING_MODEL || 'nvidia/embed-qa-4')
        : (process.env.NVIDIA_MODEL || process.env.AI_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct'),
      providerName: 'NVIDIA AI',
    };
  }

  if (envProvider === 'groq') {
    return {
      apiKey: process.env.GROQ_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.GROQ_BASE_URL || process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      providerName: 'Groq',
    };
  }

  if (envProvider === 'deepseek') {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || 'deepseek-chat',
      providerName: 'DeepSeek',
    };
  }

  if (envProvider === 'gemini') {
    return {
      apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: purpose === 'embedding'
        ? (process.env.GEMINI_EMBEDDING_MODEL || process.env.AI_EMBEDDING_MODEL || 'text-embedding-004')
        : (process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-1.5-pro'),
      providerName: 'Google Gemini',
    };
  }

  // Fallback to OmniRoute / Generic OpenAI compatible configured via environment
  const omniKey = process.env.OMNIROUTE_API_KEY || process.env.OMNI_API_KEY || process.env.AI_API_KEY || '';
  const omniBaseUrl = process.env.OMNIROUTE_BASE_URL || process.env.AI_BASE_URL || 'https://api.omniroute.ai/v1';
  const omniModel = purpose === 'embedding'
    ? (process.env.AI_EMBEDDING_MODEL || 'openai/text-embedding-3-small')
    : (process.env.AI_MODEL || process.env.OMNIROUTE_MODEL || 'auto/best-chat');

  return {
    apiKey: omniKey,
    baseUrl: omniBaseUrl,
    model: omniModel,
    providerName: envProvider ? `Custom (${envProvider})` : (omniKey ? 'OmniRoute' : 'Default / Unauthenticated'),
  };
}

/**
 * Universal chat completion request helper supporting any configured AI provider strictly via environment settings.
 */
export async function callAICompletion(messages: Array<{ role: string; content: string }>, options: { temperature?: number; maxTokens?: number } = {}) {
  const config = getAIProviderConfig('chat');
  logger.debug(`Calling AI provider: ${config.providerName} with model: ${config.model} at ${config.baseUrl}`);

  // Special handling for native Anthropic API if key is set and baseUrl is Anthropic
  if (config.providerName === 'Anthropic Claude' && config.baseUrl.includes('anthropic.com')) {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

    const res = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: options.maxTokens || 4000,
        system: systemMsg,
        messages: chatMsgs,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return data.content && data.content[0] ? data.content[0].text : '';
  }

  // Standard OpenAI-compatible format (OmniRoute, Ollama, OpenAI, NVIDIA, Groq, DeepSeek, etc.)
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${config.providerName} API error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
}
