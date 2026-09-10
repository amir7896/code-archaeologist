import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BrandMark } from './BrandMark';

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
    <main className="grid min-h-screen bg-ink lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-14">
        <BrandMark />
        <div className="mt-10 flex gap-2">
          <AuthTab to="/login">Sign in</AuthTab>
          <AuthTab to="/register">Create account</AuthTab>
        </div>
        <div className="mx-auto mt-10 w-full max-w-md lg:mx-0">
          <h1 className="text-4xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_70%_20%,rgba(139,140,255,0.18),transparent_42%),linear-gradient(180deg,#0e101f,#0b0b13)] px-12 py-16 lg:flex lg:flex-col lg:justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Evidence-first, not vibes-first
        </p>
        <h2 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
          Every answer is grounded in your Git history — with citations.
        </h2>
        <div className="mt-10 max-w-md rounded-3xl border border-white/10 bg-panel/80 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-2">Investigation</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Why does UserService have three payment services? — cites commit 3f1a9e7 and related history
            to explain the Stripe to PayPal migration.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {['Owner', 'Admin', 'Analyst', 'Viewer'].map((role) => (
            <span
              key={role}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300"
            >
              {role}
            </span>
          ))}
        </div>
      </aside>
    </main>
  );
}

function AuthTab({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive ? 'bg-brand text-ink' : 'bg-panel text-zinc-300 hover:bg-white/5'
        }`
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}
