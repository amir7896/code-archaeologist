import { sleep } from './query';
import { type PollOptions } from './types';

const DEFAULT_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;

export async function waitUntil<T>(
  load: () => Promise<T>,
  done: (value: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;

  while (true) {
    options.signal?.throwIfAborted();
    const value = await load();
    if (done(value)) {
      return value;
    }
    if (Date.now() - started >= timeoutMs) {
      throw new Error('Timed out waiting for the operation to finish');
    }
    await sleep(intervalMs, options.signal);
  }
}

export function isTerminalRunStatus(status: string): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED' || status === 'READY';
}

export function isFailedStatus(status: string): boolean {
  return status === 'FAILED' || status === 'CANCELLED';
}
