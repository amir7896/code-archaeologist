import { type ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-tight text-indigo-600">Code Archaeologist</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
