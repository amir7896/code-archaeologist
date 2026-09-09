import { Link } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';

export function NotFoundPage() {
  return (
    <PageFrame>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Page not found</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        This page is not available. It may have been moved, or you may not have access.
      </p>
      <Link className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500" to="/">
        Back to workspaces
      </Link>
    </PageFrame>
  );
}
