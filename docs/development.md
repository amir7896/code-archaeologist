# Development setup

## Prerequisites

- Node.js 20+
- pnpm 10 (`corepack enable`)
- Docker Engine and Docker Compose
- Git

## First checkout

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

`pnpm docker:up` starts PostgreSQL and Redis only. The API, worker, and web app run on the host for faster TypeScript reload.

If ports 5432 or 6379 are already in use, set `POSTGRES_PORT` and `REDIS_PORT` in `.env` before starting Compose.

## URLs

| Surface | URL |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Liveness | http://localhost:3000/api/v1/health |
| Readiness | http://localhost:3000/api/v1/health/ready |
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs/json |

## API DTOs and ValidationPipe

The API uses a global ValidationPipe (`apps/api/src/common/validation.pipe.ts`). Future request DTOs should use `class-validator` and `@nestjs/swagger` decorators:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
```

Unknown fields are rejected. Failed validation returns `400` with `code: VALIDATION_ERROR`.


## Common commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate          # interactive Prisma migrate during later schema work
pnpm db:migrate:deploy   # apply committed migrations
```

## Ollama (optional, later phases)

Ollama is not required for Phase 0.

```bash
docker compose --profile ai up -d ollama
```

RAM guidance:

- 7B/8B model: about 8 GB
- Comfortable local use: 16 GB+
- 31 GB machines can run API, worker, Postgres, Redis, and a 7B–14B model together

Do not start with the chatbot. Graph and evidence come first.
