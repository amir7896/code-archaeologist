import { API_PREFIX } from '@code-archaeologist/shared';

/** Typed SDK is implemented in the CLI/SDK phase. */
export function createClient(baseUrl: string): { baseUrl: string; apiPrefix: string } {
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiPrefix: API_PREFIX };
}
