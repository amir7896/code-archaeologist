# Demo shop (TypeScript)

Small HTTPS-ingestible sample: users, auth, and payments with a real import graph. Use it to try Explorer, Architecture, Code DNA, Impact, and Ask.

This folder is **not** a second analysis engine. Connect its Git remote to a self-hosted Code Archaeologist API the same way you connect any other HTTPS repository.

## Connect after this product is on GitHub

Until you publish a dedicated demo remote, ingest this product repository and browse `examples/demo-ts/src`:

```
https://github.com/amir7896/code-archaeologist.git
```

Or copy this folder to its own GitHub repo and connect that URL (HTTPS only).

```bash
pnpm ca init --email you@example.com --workspace-name Demo --url https://github.com/YOUR/demo-ts.git
pnpm ca analyze --json
pnpm ca ask "Why does charge exist?" --json
pnpm ca impact src/payments/charge.ts --json
```

Every ingest is **Full**.

## Golden Ask questions

Expected evidence is a path or symbol in this tree, not a canned sentence.

| Question | Look for |
|---|---|
| Why does `charge` exist? | `src/payments/charge.ts` |
| Who introduced `createUser`? | `src/users/create-user.ts` (FILE_ADDED / commit link, scored) |
| What depends on `validateToken`? | `src/auth/validate-token.ts` consumers |
| What happens if I change `charge`? | Impact on `createUser` / `src/index.ts` |
| Which modules are risky? | Hotspots for `charge` / `createUser` |
| How has payments evolved? | Evolution / evidence for `src/payments` |

A 50–200 question public benchmark is still later. These six are the v1 fixture.
