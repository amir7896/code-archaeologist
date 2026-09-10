export type FlagValue = string | boolean;

export type ParsedArgs = {
  command?: string;
  positionals: string[];
  flags: Record<string, FlagValue>;
};

const ALIASES: Record<string, string> = {
  h: 'help',
  v: 'version',
  w: 'workspace',
  r: 'repository',
};

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};
  let command: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (token.startsWith('--')) {
      const [rawKey, inline] = splitFlag(token.slice(2));
      const key = ALIASES[rawKey] ?? rawKey;
      if (inline !== undefined) {
        flags[key] = inline;
        continue;
      }
      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        index += 1;
        continue;
      }
      flags[key] = true;
      continue;
    }
    if (token.startsWith('-') && token.length === 2) {
      const key = ALIASES[token[1]] ?? token[1];
      flags[key] = true;
      continue;
    }
    if (!command) {
      command = token;
      continue;
    }
    positionals.push(token);
  }

  return { command, positionals, flags };
}

export function flagString(flags: Record<string, FlagValue>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function flagBoolean(flags: Record<string, FlagValue>, name: string): boolean {
  return flags[name] === true || flags[name] === 'true' || flags[name] === '1';
}

export function flagNumber(flags: Record<string, FlagValue>, name: string): number | undefined {
  const value = flagString(flags, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitFlag(token: string): [string, string | undefined] {
  const eq = token.indexOf('=');
  if (eq === -1) {
    return [token, undefined];
  }
  return [token.slice(0, eq), token.slice(eq + 1)];
}
