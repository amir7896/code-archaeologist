export interface LlmChatRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
}

export interface LlmChatResponse {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmEmbedRequest {
  model: string;
  input: string;
}

export interface LlmProvider {
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
  embed?(request: LlmEmbedRequest): Promise<number[]>;
  health(): Promise<{ ok: boolean; provider: string }>;
}

export class LlmProviderNotImplementedError extends Error {
  constructor(provider = 'ollama') {
    super(`${provider} adapter is not implemented yet. AI investigation is a later phase.`);
    this.name = 'LlmProviderNotImplementedError';
  }
}
