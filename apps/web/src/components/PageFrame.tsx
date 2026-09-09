import { type ReactNode } from 'react';

export function PageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>;
}

export function ExplorerFrame({ children }: { children: ReactNode }) {
  return <div className="flex h-[calc(100vh-3.5rem)] min-h-[28rem] overflow-hidden bg-zinc-50">{children}</div>;
}
