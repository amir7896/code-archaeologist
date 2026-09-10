import { type ReactNode } from 'react';

export function PageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>;
}

export function ExplorerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[28rem] flex-col overflow-hidden bg-ink p-4">{children}</div>
  );
}
