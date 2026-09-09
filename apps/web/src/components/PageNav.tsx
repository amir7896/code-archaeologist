import { Link } from 'react-router-dom';

export function PageNav({
  backTo,
  backLabel,
  crumbs,
}: {
  backTo: string;
  backLabel: string;
  crumbs?: Array<{ to?: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        to={backTo}
      >
        <BackArrow />
        {backLabel}
      </Link>
      {crumbs && crumbs.length > 0 ? (
        <nav
          aria-label="Location"
          className="flex flex-wrap items-center gap-x-1.5 text-sm text-zinc-500"
        >
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-x-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.to ? (
                <Link className="text-indigo-600 hover:text-indigo-500" to={crumb.to}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function BackArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5 7 10l5.5 5.5M7 10h9" />
    </svg>
  );
}
