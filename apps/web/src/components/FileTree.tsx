import { useEffect, useState } from 'react';
import { errorMessage } from '../lib/errors';
import { useSourceTreeQuery } from '../queries';
import { muted } from '../ui';
import type { FileTreeNode } from '../api';

export function FileTree({
  workspaceId,
  repositoryId,
  prefix = '',
  selectedId,
  selectedPath = '',
  onSelect,
  depth = 0,
}: {
  workspaceId: string;
  repositoryId: string;
  prefix?: string;
  selectedId: string;
  selectedPath?: string;
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
      <p className="px-2 py-3 text-sm text-red-300">{errorMessage(treeQuery.error, 'Unable to load files')}</p>
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
      {items.map((item) => {
        if (item.kind === 'folder' && prefix && (item.path === prefix || !item.path.startsWith(`${prefix}/`))) {
          return null;
        }
        return item.kind === 'folder' ? (
          <FolderRow
            key={item.path}
            item={item}
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            selectedId={selectedId}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth}
          />
        ) : (
          <FileRow key={item.fileId ?? item.path} item={item} selectedId={selectedId} onSelect={onSelect} depth={depth} />
        );
      })}
    </ul>
  );
}

function FolderRow({
  item,
  workspaceId,
  repositoryId,
  selectedId,
  selectedPath,
  onSelect,
  depth,
}: {
  item: FileTreeNode;
  workspaceId: string;
  repositoryId: string;
  selectedId: string;
  selectedPath: string;
  onSelect: (fileId: string) => void;
  depth: number;
}) {
  const containsSelected = Boolean(selectedPath && (selectedPath === item.path || selectedPath.startsWith(`${item.path}/`)));
  const [open, setOpen] = useState(containsSelected);

  useEffect(() => {
    if (containsSelected) {
      setOpen(true);
    }
  }, [containsSelected]);

  return (
    <li>
      <button
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-zinc-300 hover:bg-white/5"
        type="button"
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronIcon open={open} />
        <FolderIcon />
        <span className="min-w-0 truncate text-sm">{item.name}</span>
      </button>
      {open ? (
        <FileTree
          workspaceId={workspaceId}
          repositoryId={repositoryId}
          prefix={item.path}
          selectedId={selectedId}
          selectedPath={selectedPath}
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
  const selected = Boolean(fileId && fileId === selectedId);
  return (
    <li>
      <button
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
          selected ? 'bg-brand/20 text-white' : 'text-zinc-200 hover:bg-white/5'
        }`}
        type="button"
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        onClick={() => fileId && onSelect(fileId)}
      >
        <span className="w-3 shrink-0" />
        <FileIcon selected={selected} />
        <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
      </button>
    </li>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-zinc-500" fill="currentColor" aria-hidden="true">
      {open ? <path d="M2.5 4.2h7L6 9.2z" /> : <path d="M4.2 2.5v7L9.2 6z" />}
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="currentColor" aria-hidden="true">
      <path d="M2 4.2A1.2 1.2 0 0 1 3.2 3h3.1l1.2 1.4h5.3A1.2 1.2 0 0 1 14 5.6v6.2A1.2 1.2 0 0 1 12.8 13H3.2A1.2 1.2 0 0 1 2 11.8z" />
    </svg>
  );
}

function FileIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-brand-2' : 'text-zinc-500'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M5 2.5h4.2L13 6.3V13a.8.8 0 0 1-.8.8H5A.8.8 0 0 1 4.2 13V3.3A.8.8 0 0 1 5 2.5Z" />
      <path d="M9.2 2.5V6.3H13" />
    </svg>
  );
}
