import { createLogger } from '../utils/logger.js';

const logger = createLogger('ai-provider');

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerName: string;
}

/**
  * Resolves the active AI provider configuration from environment variables.
  * Supports OmniRoute, Nvidia, Anthropic (Claude), Ollama, OpenAI, DeepSeek, Google (Gemini), Groq, Together, etc.
  */
export function getAIProviderConfig(purpose: 'chat' | 'embedding' | 'vision' = 'chat'): AIProviderConfig {
  // 0. Check AI_PROVIDER explicitly or Ollama override
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  const checkOmniKey = process.env.OMNIROUTE_API_KEY || process.env.OMNI_API_KEY;

  if (envProvider === 'ollama' || (process.env.OLLAMA_BASE_URL && (!checkOmniKey || checkOmniKey.trim() === ''))) {
    const modelName = process.env.AI_MODEL || process.env.OLLAMA_MODEL || process.env.MODEL || 'llama3';
    return {
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      model: purpose === 'embedding' ? (process.env.AI_EMBEDDING_MODEL || 'nomic-embed-text') : modelName,
      providerName: 'Ollama (Local)',
    };
  }

  // 1. Check custom override env vars first
  const customKey = process.env.AI_API_KEY || process.env.API_KEY;
  const customBaseUrl = process.env.AI_BASE_URL || process.env.BASE_URL;
  const customModel = purpose === 'embedding'
    ? (process.env.AI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL)
    : (process.env.AI_MODEL || process.env.MODEL);

  if (customKey || customBaseUrl || customModel) {
    const isOllama = (customBaseUrl && customBaseUrl.includes('11434')) || (customModel && !customKey);
    return {
      apiKey: customKey || (isOllama ? 'ollama-local' : ''),
      baseUrl: customBaseUrl || (isOllama ? 'http://localhost:11434/v1' : 'https://api.omniroute.ai/v1'),
      model: customModel || (purpose === 'embedding' ? 'text-embedding-3-small' : 'auto/best-chat'),
      providerName: 'Custom AI Provider',
    };
  }

  // 2. Check Ollama (Local LLM via model name like OLLAMA_MODEL=llama3 or MODEL=deepseek-r1)
  const ollamaModel = process.env.OLLAMA_MODEL || (process.env.MODEL && !process.env.OMNIROUTE_API_KEY && !process.env.NVIDIA_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY ? process.env.MODEL : null);
  if (ollamaModel || (process.env.OLLAMA_BASE_URL)) {
    const modelName = ollamaModel || 'llama3';
    return {
      apiKey: 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      model: purpose === 'embedding' ? 'nomic-embed-text' : modelName,
      providerName: 'Ollama (Local)',
    };
  }

  // 3. Check Anthropic / Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && purpose === 'chat') {
    return {
      apiKey: anthropicKey,
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      providerName: 'Anthropic Claude',
    };
  }

  // 4. Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: purpose === 'embedding'
        ? (process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small')
        : (process.env.OPENAI_MODEL || 'gpt-4o'),
      providerName: 'OpenAI',
    };
  }

  // 5. Check NVIDIA
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey) {
    return {
      apiKey: nvidiaKey,
      baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      model: purpose === 'embedding' ? 'nvidia/embed-qa-4' : (process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct'),
      providerName: 'NVIDIA AI',
    };
  }

  // 6. Check Groq / DeepSeek / Together / etc.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      apiKey: groqKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      providerName: 'Groq',
    };
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    return {
      apiKey: deepseekKey,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      providerName: 'DeepSeek',
    };
  }

  // 7. Default to OmniRoute / Generic OpenAI compatible
  const omniKey = process.env.OMNIROUTE_API_KEY || process.env.OMNI_API_KEY;
  return {
    apiKey: omniKey || '',
    baseUrl: process.env.OMNIROUTE_BASE_URL || 'https://api.omniroute.ai/v1',
    model: purpose === 'embedding' ? 'text-embedding-3-small' : (process.env.OMNIROUTE_MODEL || 'auto/best-chat'),
    providerName: omniKey ? 'OmniRoute' : 'Default / Unauthenticated',
  };
}

/**
 * Universal chat completion request helper supporting any configured AI provider (OmniRoute, Anthropic, OpenAI, NVIDIA, Ollama, Groq, DeepSeek, etc.)
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
