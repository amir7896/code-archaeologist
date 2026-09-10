import { muted } from '../ui';

export function SourcePreview({
  content,
  startLine,
  endLine,
  selectedLine,
  truncated,
  onSelectLine,
}: {
  content: string;
  startLine?: number;
  endLine?: number;
  selectedLine?: number;
  truncated?: boolean;
  onSelectLine?: (line: number) => void;
}) {
  const lines = content.split('\n');
  const highlightStart = startLine && startLine > 0 ? startLine : 0;
  const highlightEnd = endLine && endLine >= highlightStart ? endLine : highlightStart;

  return (
    <>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-2 text-xs leading-5 text-zinc-100 ring-1 ring-white/10">
        <code>
          {lines.map((line, index) => {
            const number = index + 1;
            const inSymbol = highlightStart > 0 && number >= highlightStart && number <= highlightEnd;
            const selected = selectedLine === number;
            const className = [
              'flex w-full text-left',
              selected ? 'bg-brand/25' : inSymbol ? 'bg-brand/10' : '',
              onSelectLine ? 'hover:bg-white/5' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const inner = (
              <>
                <span className="w-12 shrink-0 select-none border-r border-white/5 px-2 text-right text-zinc-500">
                  {number}
                </span>
                <span className="whitespace-pre px-3">{line || ' '}</span>
              </>
            );
            if (onSelectLine) {
              return (
                <button
                  key={number}
                  className={className}
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`Line ${number}`}
                  id={inSymbol && number === highlightStart ? 'source-focus' : undefined}
                  onClick={() => onSelectLine(number)}
                >
                  {inner}
                </button>
              );
            }
            return (
              <span
                key={number}
                className={className}
                id={inSymbol && number === highlightStart ? 'source-focus' : undefined}
              >
                {inner}
              </span>
            );
          })}
        </code>
      </pre>
      {truncated ? <p className={`mt-2 ${muted}`}>Preview is truncated.</p> : null}
    </>
  );
}
