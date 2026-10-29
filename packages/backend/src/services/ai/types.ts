export type AIProviderType = 'omniroute' | 'ollama' | 'nvidia' | 'anthropic' | 'openai' | 'gemini' | 'openai-compatible' | 'auto';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: 'text' | 'json_object';
}

export interface AIClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
}
