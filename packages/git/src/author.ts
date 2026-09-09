export function normalizeAuthorName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed || 'Unknown';
}

export function normalizeAuthorEmail(email: string, name: string): string {
  const trimmed = email.trim().toLowerCase();
  if (trimmed.includes('@') && !trimmed.startsWith('@') && !trimmed.endsWith('@')) {
    return trimmed.slice(0, 320);
  }
  const slug =
    normalizeAuthorName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'unknown';
  return `${slug.slice(0, 200)}@unknown.local`;
}
