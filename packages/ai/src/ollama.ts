import type { LlmChatRequest, LlmChatResponse, LlmEmbedRequest, LlmProvider } from './types';

const DEFAULT_TIMEOUT_MS = 45_000;

export class OllamaProvider implements LlmProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async health(): Promise<{ ok: boolean; provider: string }> {
    try {
      const response = await this.request('/api/tags', { method: 'GET' });
      return { ok: response.ok, provider: 'ollama' };
    } catch {
      return { ok: false, provider: 'ollama' };
    }
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const response = await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: { temperature: request.temperature ?? 0.1 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama chat failed (${response.status})`);
    }
    const body = (await response.json()) as {
      message?: { content?: string };
      model?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      content: body.message?.content?.trim() || '',
      model: body.model || request.model,
      promptTokens: body.prompt_eval_count,
      completionTokens: body.eval_count,
    };
  }

  async embed(request: LlmEmbedRequest): Promise<number[]> {
    const response = await this.request('/api/embed', {
      method: 'POST',
      body: JSON.stringify({ model: request.model, input: request.input }),
    });
    if (!response.ok) {
      throw new Error(`Ollama embed failed (${response.status})`);
    }
    const body = (await response.json()) as { embeddings?: number[][] };
    return body.embeddings?.[0] ?? [];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(new URL(path, this.baseUrl).toString(), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
