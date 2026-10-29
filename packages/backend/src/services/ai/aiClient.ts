import { ChatMessage, ChatOptions } from './types.js';
import { resolveAIConfig } from './config.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ai-client');

export async function callChatCompletion(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const config = resolveAIConfig('chat');
  const activeModel = options.model || config.model;

  logger.debug(`AI Request -> Provider: ${config.provider}, Model: ${activeModel}, BaseURL: ${config.baseUrl}`);

  // 1. Anthropic Native Messages API
  if (config.provider === 'anthropic' || (config.baseUrl.includes('anthropic.com'))) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required (set ANTHROPIC_API_KEY)');
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

    const res = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: activeModel,
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

  // 2. OpenAI-Compatible API (OmniRoute, Ollama, OpenAI, NVIDIA, Gemini OpenAI compatibility layer, Groq, DeepSeek, Custom)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey && config.apiKey !== 'ollama' && config.apiKey !== 'ollama-local') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body: any = {
    model: activeModel,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens || 4000,
  };

  if (options.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Provider (${config.provider}) error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = resolveAIConfig('embedding');

  if (config.baseUrl.includes('20128') || config.provider === 'omniroute' || !config.baseUrl.includes('openai.com')) {
    return generatePseudoEmbedding(text, 1536);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey && config.apiKey !== 'ollama' && config.apiKey !== 'ollama-local') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  try {
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: text.slice(0, 8000),
        model: config.model,
        encoding_format: 'float',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.warn(`Embedding API error (${res.status}), using pseudo-embedding fallback`, { error: errText });
      return generatePseudoEmbedding(text, 1536);
    }

    const data: any = await res.json();
    if (data && data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding;
    }

    return generatePseudoEmbedding(text, 1536);
  } catch (error: any) {
    logger.warn('Failed to connect to embedding API, falling back to pseudo-embeddings', { error: error.message });
    return generatePseudoEmbedding(text, 1536);
  }
}

function generatePseudoEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < dimensions; i++) {
    const seed = Math.sin(hash + i) * 10000;
    vector[i] = seed - Math.floor(seed);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vector : vector.map(val => val / magnitude);
}
