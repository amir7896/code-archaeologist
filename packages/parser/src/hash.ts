export function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashAst(parts: Array<string | number | null | undefined>): string {
  return fnv1a(parts.map((part) => String(part ?? '')).join('\u001f'));
}
