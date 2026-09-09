import { secondaryButton } from '../ui';

export function PaginationBar({
  page,
  totalPages,
  onPage,
  className = '',
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <button className={secondaryButton} type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <p className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </p>
      <button
        className={secondaryButton}
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
