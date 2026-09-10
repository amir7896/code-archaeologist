const startedAt = Date.now();
const statusCounts = new Map<string, number>();
let requests = 0;
let errors = 0;

export function recordHttpResult(status: number): void {
  requests += 1;
  if (status >= 500) {
    errors += 1;
  }
  const key = String(status);
  statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
}

export function snapshotMetrics(): {
  requests: number;
  errors: number;
  status: Record<string, number>;
  uptimeSeconds: number;
} {
  return {
    requests,
    errors,
    status: Object.fromEntries([...statusCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
}

export function resetMetricsForTests(): void {
  requests = 0;
  errors = 0;
  statusCounts.clear();
}
