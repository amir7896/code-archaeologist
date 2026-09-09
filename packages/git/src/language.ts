const EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  c: 'c',
  hpp: 'cpp',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  vue: 'vue',
  svelte: 'svelte',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  graphql: 'graphql',
  gql: 'graphql',
  swift: 'swift',
  dart: 'dart',
  proto: 'protobuf',
};

export function detectLanguage(path: string): string | null {
  const base = path.split('/').pop()?.toLowerCase() ?? '';
  if (base === 'dockerfile' || base.startsWith('dockerfile.')) {
    return 'dockerfile';
  }
  if (base === 'makefile') {
    return 'makefile';
  }
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return null;
  }
  return EXTENSIONS[base.slice(dot + 1)] ?? null;
}
