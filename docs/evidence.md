# Evidence and Ask

Ask is retrieval first. The language model, when present, only writes over numbered facts. It cannot invent a dependency set or edit the repository.

## Pipeline

Question → intent / entity resolution → repository facts → graph neighbors → Git / symbol evidence → optional GitHub threads → rank (max 12 facts) → context construction → optional Ollama → citation check → answer + confidence + limitations.

Intents in `packages/shared/src/investigation.ts`: `why_exists`, `who_introduced`, `when_changed`, `symbol_history`, `depends_on`, `impact`, `risk`, `evolution`, `overview`, `general`.

## Retrieval layers that exist

| Layer | Source |
|---|---|
| SQL / entities | Files, symbols, commits, repository languages and authors |
| Graph | `walkNeighbors` for depends-on / impact-style questions (capped) |
| Historical evidence | Commit-to-symbol links with a stored confidence |
| GitHub | Issues, pull requests, reviews when the workspace is connected and synced |
| Risk / DNA | Hotspots and risk rows for “what is risky” questions |

`pgvector` and document-chunk embeddings are **off**. There is no semantic document index.

## Confidence

- Heuristic mappings are never 1.0. Ask caps displayed confidence at `0.92`.
- Labels are deterministic (`investigationConfidenceLabel`).
- `FILE_ADDED` is treated as a stronger “who introduced this file” signal than later line overlap.
- Insufficient evidence is stated in the answer. The stock limitations string covers symbol locations, scored commit links, and GitHub-only thread text.

## Untrusted input

Repository text, commit messages, issue bodies, and the user question are data, not instructions. The prompt wraps them in delimiters. See [AI provider](ai-provider.md).

## What Ask is not

- Not a chatbot over raw source without an indexed repository.
- Not a hosted-model default.
- Not a report generator. CLI `report` is status + health + hotspots.
- Not an autonomous code-change agent.
