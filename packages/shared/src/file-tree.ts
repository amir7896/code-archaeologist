export type FileTreeEntry = {
  id: string;
  path: string;
  language?: string | null;
  loc?: number | null;
};

export type FileTreeNode = {
  kind: 'folder' | 'file';
  name: string;
  path: string;
  fileCount?: number;
  fileId?: string;
  language?: string | null;
  loc?: number | null;
};

function normalizePrefix(prefix: string): string {
  return prefix.replaceAll('\\', '/').replace(/\/$/, '');
}

/** Immediate folder and file children under `prefix`. */
export function listFileTreeChildren(files: FileTreeEntry[], prefix = ''): FileTreeNode[] {
  const normalized = normalizePrefix(prefix);
  const folders = new Map<string, number>();
  const children: FileTreeNode[] = [];

  for (const file of files) {
    const path = file.path.replaceAll('\\', '/');
    if (normalized) {
      if (path === normalized || !path.startsWith(`${normalized}/`)) {
        continue;
      }
    }
    const rest = normalized ? path.slice(normalized.length + 1) : path;
    const slash = rest.indexOf('/');
    if (slash === -1) {
      children.push({
        kind: 'file',
        name: rest,
        path,
        fileId: file.id,
        language: file.language ?? null,
        loc: file.loc ?? null,
      });
      continue;
    }
    const name = rest.slice(0, slash);
    const folderPath = normalized ? `${normalized}/${name}` : name;
    folders.set(folderPath, (folders.get(folderPath) ?? 0) + 1);
  }

  const folderNodes = [...folders.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, fileCount]) => ({
      kind: 'folder' as const,
      name: path.split('/').pop() || path,
      path,
      fileCount,
    }));

  return [
    ...folderNodes,
    ...children.sort((left, right) => left.name.localeCompare(right.name)),
  ];
}

export function toFileTreeSearchNodes(files: FileTreeEntry[]): FileTreeNode[] {
  return files.map((file) => ({
    kind: 'file' as const,
    name: file.path.split('/').pop() || file.path,
    path: file.path,
    fileId: file.id,
    language: file.language ?? null,
    loc: file.loc ?? null,
  }));
}
