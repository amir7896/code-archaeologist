# Installation / Docker

## Small self-hosted install

One machine can run Docker Compose for small repositories.

### Infrastructure only (recommended while developing)

```bash
cp .env.example .env
docker compose up -d postgres redis
```

Then run `pnpm dev` on the host.

### Full application stack

```bash
cp .env.example .env
docker compose --profile full up --build
```

This builds and starts API, worker, and web in addition to PostgreSQL and Redis.

Web is published on port 5173 and proxies `/api/` to the API container.

### Optional Ollama

```bash
docker compose --profile ai up -d ollama
```

Pull a model after the container is healthy, for example `llama3.1:8b`. Phase 0 does not call Ollama.

## Health

- API liveness: `GET /api/v1/health`
- API readiness: `GET /api/v1/health/ready` (PostgreSQL + Redis)
- API metrics: `GET /api/v1/metrics` (in-memory request counts)

## Notes

- `.env.example` contains local defaults only. Do not put real credentials there.
- Persistent volumes are used for Postgres, Redis AOF, and optional Ollama models.
- Kubernetes is deferred. Docker Compose is the v1 self-hosting path.
