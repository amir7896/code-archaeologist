# AI provider

LLM access lives in `@code-archaeologist/ai`. Ollama is the only implemented provider. Hosted models are not wired. Settings shows hosted AI as disabled and requires disclosure before source would ever leave the machine.

## Contract

```ts
interface LlmProvider {
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
  embed?(request: LlmEmbedRequest): Promise<number[]>;
  health(): Promise<{ ok: boolean; provider: string }>;
}
```

`OllamaProvider` calls `/api/chat` and `/api/tags` on `OLLAMA_BASE_URL`. Streaming is off. Embeddings are unused: `pgvector` stays off.

## How Ask uses the model

1. The worker retrieves ranked facts from SQL, the graph, Git evidence, and optional GitHub threads.
2. If Ollama is down, the answer is the retrieved evidence plus limitations. That is a success, not a failure.
3. If Ollama is up, `buildInvestigationUserPrompt` wraps the question and evidence in `<<<QUESTION` / `<<<EVIDENCE`. The system prompt forbids invented citations and repository edits.
4. Citation numbers in the model output are checked against the retrieved set.

`GET .../ai/status` reports `{ provider: 'ollama', model, available }`.

## Local resources

| Setup | RAM guidance |
|---|---|
| 7B/8B model | about 8 GB |
| Comfortable local use | 16 GB+ |
| API + worker + Postgres + Redis + 7B–14B | 31 GB class machines |

```bash
docker compose --profile ai up -d ollama
```

Then pull `OLLAMA_MODEL` (default `llama3.1:8b`).
