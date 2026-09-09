const EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyi: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  h: 'c',
  c: 'c',
  swift: 'swift',
  scala: 'scala',
  dart: 'dart',
};

export const PARSEABLE_LANGUAGES = new Set([
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'kotlin',
  'ruby',
  'php',
  'csharp',
  'c',
  'cpp',
  'swift',
  'scala',
  'dart',
]);

export function detectParserLanguage(path: string): string {
  const base = path.split('/').pop()?.toLowerCase() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return 'unknown';
  }
  return EXTENSIONS[base.slice(dot + 1)] ?? 'unknown';
}

export function isParseableLanguage(language: string | null | undefined): boolean {
  return Boolean(language && PARSEABLE_LANGUAGES.has(language));
}
