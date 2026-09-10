import { redactSecrets } from '@code-archaeologist/sdk';

export type Io = {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

export function usesJson(flags: { json?: boolean; format?: string }): boolean {
  return Boolean(flags.json) || flags.format === 'json';
}

export function progress(io: Io, message: string): void {
  io.stderr.write(`${redactSecrets(message)}\n`);
}

export function writeOk(io: Io, json: boolean, command: string, data: unknown, text: string): void {
  if (json) {
    io.stdout.write(`${JSON.stringify({ ok: true, command, data })}\n`);
    return;
  }
  io.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

export function writeErr(io: Io, json: boolean, command: string, code: string, message: string): void {
  const safe = redactSecrets(message);
  if (json) {
    io.stdout.write(`${JSON.stringify({ ok: false, command, error: { code, message: safe } })}\n`);
    return;
  }
  io.stderr.write(`${safe}\n`);
}

export function formatList(rows: Array<[string, string]>): string {
  const width = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
  return rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join('\n');
}
