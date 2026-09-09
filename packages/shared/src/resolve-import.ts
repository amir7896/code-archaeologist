const FILE_SUFFIXES = [
  '.py',
  '.pyi',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.rb',
  '.php',
];

const INDEX_FILES = [
  '__init__.py',
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'mod.rs',
];

/**
 * Map an import specifier onto an indexed file path.
 * Only returns a path that already exists in `knownPaths`, so stdlib/packages stay unresolved.
 */
export function resolveImportPath(
  spec: string,
  sourcePath: string,
  knownPaths: ReadonlySet<string>,
): string | null {
  const normalized = spec.replaceAll('\\', '/').trim();
  if (!normalized) {
    return null;
  }
  if (knownPaths.has(normalized)) {
    return normalized;
  }

  const candidates = normalized.startsWith('.')
    ? relativeCandidates(sourcePath, normalized)
    : moduleCandidates(normalized);

  for (const candidate of candidates) {
    if (knownPaths.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function fileLinksFromImports(input: {
  files: Array<{ id: string; path: string }>;
  symbols: Array<{ id: string; fileId: string }>;
  imports: Array<{ sourceId: string; targetKey: string; confidence: number }>;
}): Array<{ from: string; to: string; confidence: number }> {
  const fileIdByPath = new Map(input.files.map((file) => [file.path, file.id]));
  const pathByFileId = new Map(input.files.map((file) => [file.id, file.path]));
  const knownPaths = new Set(input.files.map((file) => file.path));
  const fileIdBySymbol = new Map(input.symbols.map((symbol) => [symbol.id, symbol.fileId]));
  const links = new Map<string, { from: string; to: string; confidence: number }>();

  for (const edge of input.imports) {
    const from = fileIdBySymbol.get(edge.sourceId);
    const sourcePath = from ? pathByFileId.get(from) : undefined;
    if (!from || !sourcePath) {
      continue;
    }
    const targetPath = resolveImportPath(edge.targetKey, sourcePath, knownPaths);
    const to = targetPath ? fileIdByPath.get(targetPath) : undefined;
    if (!to || to === from) {
      continue;
    }
    const key = `${from}\0${to}`;
    const existing = links.get(key);
    if (!existing || edge.confidence > existing.confidence) {
      links.set(key, { from, to, confidence: edge.confidence });
    }
  }
  return [...links.values()];
}

function moduleCandidates(spec: string): string[] {
  const dotted = spec.replaceAll('.', '/');
  const prefixes = prefixesOf(dotted);
  const out: string[] = [];
  for (const prefix of prefixes) {
    pushResolved(out, prefix);
  }
  return out;
}

function relativeCandidates(sourcePath: string, spec: string): string[] {
  const dir = sourcePath.replaceAll('\\', '/').split('/').slice(0, -1);
  const parts = spec.split('/').filter((part) => part.length > 0);
  const stack = [...dir];
  for (const part of parts) {
    if (part === '.') {
      continue;
    }
    if (part === '..') {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  const base = stack.join('/');
  if (!base) {
    return [];
  }
  const out: string[] = [];
  pushResolved(out, base);
  return out;
}

function prefixesOf(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const prefixes: string[] = [];
  for (let index = parts.length; index >= 1; index -= 1) {
    prefixes.push(parts.slice(0, index).join('/'));
  }
  return prefixes;
}

function pushResolved(out: string[], base: string): void {
  out.push(base);
  if (FILE_SUFFIXES.some((suffix) => base.endsWith(suffix))) {
    return;
  }
  for (const suffix of FILE_SUFFIXES) {
    out.push(`${base}${suffix}`);
  }
  for (const indexFile of INDEX_FILES) {
    out.push(`${base}/${indexFile}`);
  }
}
