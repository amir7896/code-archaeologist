# Community announcement (draft)

Copy, edit the GitHub URL if needed, then post when `v1.0.0` is tagged. Do not announce a hosted SaaS or incremental analysis.

---

**Code Archaeologist v1.0 is out.**

It is an open-source, self-hosted system that turns a Git repository into an evidence-backed historical knowledge graph: history, symbols, dependencies, risk, and cited Ask. AI does not silently change repositories.

- Repo: https://github.com/amir7896/code-archaeologist
- License: MIT
- Quick start: clone, `cp .env.example .env`, `pnpm install`, `pnpm docker:up`, `pnpm db:migrate:deploy`, `pnpm dev`
- Optional local model: Ollama. Ask still works from indexed evidence without it.
- Demo tree: `examples/demo-ts`

Honest limits: every ingest is a full analysis; GitLab/Bitbucket and hosted AI are later; the Operations nav item is not a dashboard yet.

Issues and good first issues are welcome if they fit the [roadmap](roadmap.md).
---
