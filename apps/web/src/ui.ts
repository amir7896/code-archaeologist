export function fieldClass(invalid = false): string {
  return [
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition',
    'placeholder:text-zinc-400 focus:ring-2',
    invalid
      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
      : 'border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20',
  ].join(' ');
}

export const primaryButton =
  'inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButton =
  'inline-flex cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50';

export const card = 'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm';

export const navItem =
  'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition';

export const navItemActive = `${navItem} bg-indigo-50 font-medium text-indigo-700`;

export const navItemIdle = `${navItem} text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900`;

export const errorText = 'mt-1 text-sm text-red-600';

export const muted = 'text-sm text-zinc-500';
