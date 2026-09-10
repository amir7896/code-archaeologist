export function fieldClass(invalid = false): string {
  return [
    'w-full rounded-2xl border bg-ink-2 px-3.5 py-2.5 text-sm text-white outline-none transition',
    'placeholder:text-zinc-500 focus:ring-2',
    invalid
      ? 'border-red-400/50 bg-red-500/10 focus:border-red-400 focus:ring-red-400/20'
      : 'border-white/10 focus:border-brand focus:ring-brand/25',
  ].join(' ');
}

export const primaryButton =
  'inline-flex cursor-pointer items-center justify-center rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButton =
  'inline-flex cursor-pointer items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20';

export const card = 'rounded-3xl border border-white/10 bg-panel p-6 shadow-none';

export const iconButton =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-panel text-zinc-300 transition hover:bg-white/5 hover:text-white';

export const navItem =
  'flex items-center gap-2.5 rounded-full px-3 py-2 text-sm transition';

export const navItemActive = `${navItem} bg-[#1c1c2a] font-medium text-white`;

export const navItemIdle = `${navItem} text-zinc-400 hover:bg-white/5 hover:text-white`;

export const errorText = 'mt-1 text-sm text-red-300';

export const muted = 'text-sm text-zinc-400';

export const pageTitle = 'text-2xl font-semibold tracking-tight text-white';

export const sectionTitle = 'text-sm font-semibold text-white';

export const linkClass = 'font-medium text-brand hover:text-brand-2';
