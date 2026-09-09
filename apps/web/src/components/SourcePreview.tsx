import { muted } from '../ui';

export function SourcePreview({
  content,
  startLine,
  endLine,
  truncated,
}: {
  content: string;
  startLine?: number;
  endLine?: number;
  truncated?: boolean;
}) {
  const lines = content.split('\n');
  const highlightStart = startLine && startLine > 0 ? startLine : 0;
  const highlightEnd = endLine && endLine >= highlightStart ? endLine : highlightStart;

  return (
    <>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-white text-xs leading-5 text-zinc-800 ring-1 ring-zinc-200">
        <code>
          {lines.map((line, index) => {
            const number = index + 1;
            const active = highlightStart > 0 && number >= highlightStart && number <= highlightEnd;
            return (
              <span
                key={number}
                className={`flex ${active ? 'bg-indigo-50' : ''}`}
                id={active && number === highlightStart ? 'source-focus' : undefined}
              >
                <span className="w-12 shrink-0 select-none border-r border-zinc-100 px-2 text-right text-zinc-400">
                  {number}
                </span>
                <span className="whitespace-pre px-3">{line || ' '}</span>
              </span>
            );
          })}
        </code>
      </pre>
      {truncated ? <p className={`mt-2 ${muted}`}>Preview is truncated.</p> : null}
    </>
  );
}
