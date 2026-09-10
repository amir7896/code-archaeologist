import { formatStatus } from '../lib/format';

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'READY' || status === 'ACTIVE' || status === 'SUCCEEDED'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'FAILED'
        ? 'bg-red-500/15 text-red-300'
        : status === 'SYNCING' || status === 'RUNNING' || status === 'PENDING' || status === 'QUEUED'
          ? 'bg-brand/15 text-brand-2'
          : 'bg-white/10 text-zinc-400';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}
