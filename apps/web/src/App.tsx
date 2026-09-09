import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
  version: string;
  checks?: {
    postgres: boolean;
    redis: boolean;
  };
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

async function fetchReady(signal: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBase}/health/ready`, { signal });
  const body = (await response.json()) as HealthResponse;
  if (!response.ok) {
    throw new Error('API is running but postgres or redis is not ready.');
  }
  return body;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const waitForApi = async () => {
      const attempts = 20;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const body = await fetchReady(controller.signal);
          if (!cancelled) {
            setHealth(body);
            setError(null);
          }
          return;
        } catch (cause) {
          if (controller.signal.aborted || cancelled) {
            return;
          }
          if (attempt === attempts) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Cannot reach the API. Start postgres, redis, and the API first.',
            );
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    };

    void waitForApi();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Phase 0 · Foundation</p>
        <h1 className="mt-3 text-4xl font-semibold">Code Archaeologist</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Evidence-backed repository intelligence. This scaffold is the modular monolith, workers,
          React app, PostgreSQL, Redis, and environment validation. Auth and analysis come next.
        </p>
      </div>
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">System health</h2>
        {health ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-400">API</dt>
              <dd className="mt-1 font-medium">{health.status}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Version</dt>
              <dd className="mt-1 font-medium">{health.version}</dd>
            </div>
            <div>
              <dt className="text-slate-400">PostgreSQL</dt>
              <dd className="mt-1 font-medium">{health.checks?.postgres ? 'ready' : 'down'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Redis</dt>
              <dd className="mt-1 font-medium">{health.checks?.redis ? 'ready' : 'down'}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Waiting for API at /api/v1/health/ready…</p>
        )}
        {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}
      </section>
    </main>
  );
}
