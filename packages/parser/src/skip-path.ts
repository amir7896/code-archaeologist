const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|coverage|out|\.git|\.next|\.turbo|generated|__pycache__|\.venv|venv)(\/|$)/;
const SKIP_FILE = /\.(min\.(js|css)|map|lock|bin|exe|dll|so|dylib|png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|mako)$/i;

export const MAX_PARSE_BYTES = 400_000;
export const MAX_SYMBOLS_PER_FILE = 400;

export function shouldSkipPath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');
  return SKIP_DIR.test(normalized) || SKIP_FILE.test(normalized);
}
