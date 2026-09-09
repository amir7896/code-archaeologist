import { formatStatus } from '../lib/format';

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'READY' || status === 'ACTIVE' || status === 'SUCCEEDED'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'FAILED'
        ? 'bg-red-50 text-red-700'
        : status === 'SYNCING' || status === 'RUNNING' || status === 'PENDING' || status === 'QUEUED'
          ? 'bg-indigo-50 text-indigo-700'
          : 'bg-zinc-100 text-zinc-600';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}
