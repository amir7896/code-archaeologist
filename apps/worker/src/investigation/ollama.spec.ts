import { OllamaProvider } from '@code-archaeologist/ai';

describe('OllamaProvider', () => {
  it('reports offline when the local model cannot be reached', async () => {
    const provider = new OllamaProvider('http://127.0.0.1:9', 50, async () => {
      throw new Error('offline');
    });
    await expect(provider.health()).resolves.toEqual({ ok: false, provider: 'ollama' });
  });

  it('maps a chat response and keeps streaming off', async () => {
    const provider = new OllamaProvider('http://ollama.test', 1_000, async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { stream?: boolean };
      expect(body.stream).toBe(false);
      return new Response(
        JSON.stringify({
          message: { content: 'Cart totals live in cart_service [1].' },
          model: 'llama3.1:8b',
          prompt_eval_count: 12,
          eval_count: 8,
        }),
        { status: 200 },
      );
    });
    const result = await provider.chat({
      model: 'llama3.1:8b',
      messages: [{ role: 'user', content: 'Why does cart exist?' }],
    });
    expect(result.content).toBe('Cart totals live in cart_service [1].');
    expect(result.promptTokens).toBe(12);
  });
});
