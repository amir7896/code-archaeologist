export type GitignorePattern = {
  negate: boolean;
  directoryOnly: boolean;
  baseDir: string;
  regex: RegExp;
};

export function parseGitignore(content: string, baseDir = ''): GitignorePattern[] {
  const normalizedBase = normalizeDir(baseDir);
  const patterns: GitignorePattern[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripIgnoredLine(rawLine);
    if (!line) {
      continue;
    }
    let pattern = line;
    let negate = false;
    if (pattern.startsWith('!')) {
      negate = true;
      pattern = pattern.slice(1);
    }
    if (!pattern) {
      continue;
    }
    const directoryOnly = pattern.endsWith('/');
    if (directoryOnly) {
      pattern = pattern.slice(0, -1);
    }
    const anchored = pattern.startsWith('/') || pattern.includes('/');
    if (pattern.startsWith('/')) {
      pattern = pattern.slice(1);
    }
    if (!pattern) {
      continue;
    }
    patterns.push({
      negate,
      directoryOnly,
      baseDir: normalizedBase,
      regex: globToRegExp(pattern, anchored),
    });
  }
  return patterns;
}

export function matcherFromGitignoreFiles(
  files: Array<{ path: string; content: string }>,
): (path: string) => boolean {
  const patterns = [...files]
    .sort((left, right) => gitignoreDepth(left.path) - gitignoreDepth(right.path))
    .flatMap((file) => parseGitignore(file.content, gitignoreDir(file.path)));
  return (path: string) => isPathIgnored(path, patterns);
}

export function isPathIgnored(path: string, patterns: GitignorePattern[]): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  let ignored = false;
  for (const pattern of patterns) {
    if (matchesPattern(normalized, pattern)) {
      ignored = !pattern.negate;
    }
  }
  return ignored;
}

function matchesPattern(path: string, pattern: GitignorePattern): boolean {
  const relative = relativeToBase(path, pattern.baseDir);
  if (!relative) {
    return false;
  }
  const candidates = [relative, ...ancestorPaths(relative)];
  for (const candidate of candidates) {
    if (!pattern.regex.test(candidate)) {
      continue;
    }
    if (pattern.directoryOnly && candidate === relative) {
      continue;
    }
    return true;
  }
  return false;
}

function globToRegExp(pattern: string, anchored: boolean): RegExp {
  let source = '^';
  if (!anchored) {
    source += '(?:.*/)?';
  }
  source += globToSource(pattern);
  source += '$';
  return new RegExp(source);
}

function globToSource(pattern: string): string {
  let source = '';
  let index = 0;
  while (index < pattern.length) {
    if (pattern.startsWith('**/', index)) {
      source += '(?:.*/)?';
      index += 3;
      continue;
    }
    if (pattern.startsWith('**', index)) {
      source += '.*';
      index += 2;
      continue;
    }
    const character = pattern[index];
    if (character === '*') {
      source += '[^/]*';
      index += 1;
      continue;
    }
    if (character === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }
    if ('\\^$.|+(){}'.includes(character)) {
      source += `\\${character}`;
      index += 1;
      continue;
    }
    source += character;
    index += 1;
  }
  return source;
}

function stripIgnoredLine(line: string): string {
  const trimmed = line.trimEnd();
  if (!trimmed || trimmed.startsWith('#')) {
    return '';
  }
  return trimmed.trimStart();
}

function normalizeDir(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function gitignoreDir(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  if (normalized === '.gitignore') {
    return '';
  }
  return normalized.replace(/\/\.gitignore$/, '');
}

function gitignoreDepth(path: string): number {
  const dir = gitignoreDir(path);
  return dir ? dir.split('/').length : 0;
}

function relativeToBase(path: string, baseDir: string): string | null {
  if (!baseDir) {
    return path;
  }
  const prefix = `${baseDir}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }
  return path.slice(prefix.length);
}

function ancestorPaths(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  const ancestors: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    ancestors.push(segments.slice(0, index).join('/'));
  }
  return ancestors;
}
