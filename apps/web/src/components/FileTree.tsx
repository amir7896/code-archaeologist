import { useState } from 'react';
import { errorMessage } from '../lib/errors';
import { useSourceTreeQuery } from '../queries';
import { muted } from '../ui';
import type { FileTreeNode } from '../api';

export function FileTree({
  workspaceId,
  repositoryId,
  prefix = '',
  selectedId,
  onSelect,
  depth = 0,
}: {
  workspaceId: string;
  repositoryId: string;
  prefix?: string;
  selectedId: string;
  onSelect: (fileId: string) => void;
  depth?: number;
}) {
  const treeQuery = useSourceTreeQuery(workspaceId, repositoryId, { prefix });
  const items = treeQuery.data?.items ?? [];

  if (treeQuery.isPending) {
    return <p className={`px-2 py-3 ${muted}`}>{depth === 0 ? 'Loading files…' : 'Loading…'}</p>;
  }
  if (treeQuery.isError) {
    return (
      <p className="px-2 py-3 text-sm text-red-600">{errorMessage(treeQuery.error, 'Unable to load files')}</p>
    );
  }
  if (items.length === 0) {
    return depth === 0 ? (
      <p className={`px-2 py-3 ${muted}`}>No files indexed yet. Sync the repository first.</p>
    ) : (
      <p className={`px-2 py-2 ${muted}`}>Empty folder</p>
    );
  }

  return (
    <ul>
      {items.map((item) =>
        item.kind === 'folder' ? (
          <FolderRow
            key={item.path}
            item={item}
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth}
          />
        ) : (
          <FileRow key={item.fileId ?? item.path} item={item} selectedId={selectedId} onSelect={onSelect} depth={depth} />
        ),
      )}
    </ul>
  );
}

function FolderRow({
  item,
  workspaceId,
  repositoryId,
  selectedId,
  onSelect,
  depth,
}: {
  item: FileTreeNode;
  workspaceId: string;
  repositoryId: string;
  selectedId: string;
  onSelect: (fileId: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-zinc-50"
        type="button"
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="w-3 text-xs text-zinc-400">{open ? '▾' : '▸'}</span>
        <span className="min-w-0 truncate text-sm font-medium text-zinc-800">{item.name}</span>
        <span className={`ml-auto shrink-0 ${muted}`}>{item.fileCount ?? 0}</span>
      </button>
      {open ? (
        <FileTree
          workspaceId={workspaceId}
          repositoryId={repositoryId}
          prefix={item.path}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ) : null}
    </li>
  );
}

function FileRow({
  item,
  selectedId,
  onSelect,
  depth,
}: {
  item: FileTreeNode;
  selectedId: string;
  onSelect: (fileId: string) => void;
  depth: number;
}) {
  const fileId = item.fileId ?? '';
  return (
    <li>
      <button
        className={`w-full rounded-lg px-3 py-1.5 text-left ${
          fileId && fileId === selectedId ? 'bg-indigo-50' : 'hover:bg-zinc-50'
        }`}
        type="button"
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
        onClick={() => fileId && onSelect(fileId)}
      >
        <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
        <p className={`mt-0.5 truncate ${muted}`}>
          {item.language ?? 'Unknown'}
          {item.loc != null ? ` · ${item.loc} lines` : ''}
        </p>
      </button>
    </li>
  );
}
