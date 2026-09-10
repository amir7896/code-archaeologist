import { Link } from 'react-router-dom';

export function BrandMark({
  to,
  stacked = false,
  compact = false,
}: {
  to?: string;
  stacked?: boolean;
  compact?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold tracking-tight text-ink">
        CA
      </span>
      {stacked ? (
        <span className="leading-4">
          <span className="block text-sm font-semibold text-white">Code</span>
          <span className="block text-sm font-semibold text-white">Archaeologist</span>
        </span>
      ) : (
        <span className={`font-semibold tracking-tight text-white ${compact ? 'text-sm' : 'text-base'}`}>
          Code Archaeologist
        </span>
      )}
    </span>
  );

  if (!to) {
    return mark;
  }

  return (
    <Link className="inline-flex items-center" to={to}>
      {mark}
    </Link>
  );
}
