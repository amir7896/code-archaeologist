import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Historical Analysis',
    body: 'Track how your code evolved commit by commit, with confidence-scored evidence.',
  },
  {
    title: 'Dependency Mapping',
    body: 'Visualize relationships across modules, services and files as a living graph.',
  },
  {
    title: 'Impact Analysis',
    body: 'See what breaks — deterministically — before you change anything.',
  },
  {
    title: 'AI-Powered Q&A',
    body: 'Ask anything about your codebase and get cited, evidence-first answers.',
  },
];

const STACK = [
  { label: 'NestJS + PostgreSQL', color: '#2dd4bf' },
  { label: 'React + TypeScript', color: '#38bdf8' },
  { label: 'MIT Licensed', color: '#71717a' },
];

const LEGEND = [
  { label: 'Developer', color: '#38bdf8' },
  { label: 'Function', color: '#34d399' },
  { label: 'File', color: '#fbbf24' },
  { label: 'Database', color: '#fb7185' },
  { label: 'Service', color: '#a78bfa' },
];

const headerCta =
  'inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-brand-2';
const cta =
  'inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-2';
const ghost =
  'inline-flex items-center justify-center rounded-full bg-[#16161f] px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink text-zinc-100">
      <header className="mx-auto grid w-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-8 py-5">
        <a className="flex items-center gap-2.5 justify-self-start" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold tracking-tight text-ink">
            CA
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Code Archaeologist</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a className="hover:text-white" href="#features">
            Features
          </a>
          <a className="hover:text-white" href="#picture">
            Docs
          </a>
          <a
            className="hover:text-white"
            href="https://github.com/amir7896/code-archaeologist"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <Link className={`${headerCta} justify-self-end`} to="/register">
          Get Started
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-8 pb-24">
        <section className="grid items-center gap-10 pt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,30rem)] lg:gap-12 lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-panel px-3 py-1 text-[12px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              v1.0 · open source · self-hostable · Ollama-first
            </p>
            <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-[3.25rem] lg:text-[3.5rem]">
              <span className="block sm:whitespace-nowrap">
                Understand the <span className="text-[#8b8cff]">why</span>
              </span>
              <span className="block">behind your code.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-400">
              Code Archaeologist turns a Git repository into an evidence-backed historical knowledge
              graph — commit history, AST structure, dependencies and risk, explained with citations
              instead of guesses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={cta} to="/register">
                Get Started
              </Link>
              <Link className={ghost} to="/login">
                View Demo
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zinc-500">
              {STACK.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
          <HeroGraph />
        </section>

        <section id="features" className="mt-16 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-[1.75rem] bg-panel p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm text-zinc-300">
                ◆
              </span>
              <h2 className="mt-5 text-[17px] font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.body}</p>
            </article>
          ))}
        </section>

        <section id="picture" className="mt-20 grid items-center gap-10 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 className="text-[2.35rem] font-semibold tracking-tight text-white lg:whitespace-nowrap">
              See the <span className="text-[#8b8cff]">full picture</span>
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-400">
              From the first commit to the latest change, Code Archaeologist helps you understand the
              past, present and future of your codebase.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-zinc-400">
              {LEGEND.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
            <Link className={`${cta} mt-8`} to="/register">
              Start Exploring
            </Link>
          </div>
          <WideGraph />
        </section>
      </main>
    </div>
  );
}

function HeroGraph() {
  return (
    <div className="relative h-[22rem] overflow-hidden rounded-[2rem] bg-panel lg:h-[24rem]">
      <div className="absolute left-5 top-4 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
      </div>
      <svg viewBox="0 0 560 320" className="h-full w-full" aria-hidden="true">
        <line x1="150" y1="155" x2="280" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="190" y1="235" x2="280" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="305" y1="58" x2="280" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="430" y1="78" x2="280" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="448" y1="205" x2="280" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <circle cx="280" cy="165" r="22" fill="#8b8cff" />
        <circle cx="150" cy="155" r="9" fill="#38bdf8" />
        <circle cx="190" cy="235" r="8" fill="#fbbf24" />
        <circle cx="305" cy="58" r="6" fill="#c4b5fd" />
        <circle cx="430" cy="78" r="8" fill="#34d399" />
        <circle cx="448" cy="205" r="8" fill="#fb7185" />
      </svg>
    </div>
  );
}

function WideGraph() {
  return (
    <div className="h-56 overflow-hidden rounded-[2rem] bg-panel lg:h-64">
      <svg viewBox="0 0 720 240" className="h-full w-full" aria-hidden="true">
        <line x1="150" y1="48" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="210" y1="62" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="520" y1="52" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="560" y1="118" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="175" y1="188" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="500" y1="190" x2="360" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <circle cx="360" cy="118" r="20" fill="#8b8cff" />
        <circle cx="150" cy="48" r="8" fill="#34d399" />
        <circle cx="210" cy="62" r="8" fill="#38bdf8" />
        <circle cx="520" cy="52" r="8" fill="#fb7185" />
        <circle cx="560" cy="118" r="8" fill="#c4b5fd" />
        <circle cx="175" cy="188" r="8" fill="#fbbf24" />
        <circle cx="500" cy="190" r="8" fill="#2dd4bf" />
      </svg>
    </div>
  );
}
