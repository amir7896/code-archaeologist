import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { CodeExplorerPage } from './CodeExplorerPage';

const file = {
  id: 'file-1',
  path: 'src/modules/users/user.service.ts',
  language: 'typescript',
  size: 1200,
  loc: 64,
  complexity: 12,
  symbolCount: 5,
  lastRevision: 'abc',
};

const symbols = [
  {
    id: 'class-1',
    fileId: 'file-1',
    path: file.path,
    kind: 'CLASS',
    name: 'UserService',
    qualifiedName: 'UserService',
    startLine: 1,
    endLine: 64,
    loc: 64,
    complexity: 0,
    nesting: 1,
  },
  {
    id: 'method-1',
    fileId: 'file-1',
    path: file.path,
    kind: 'METHOD',
    name: 'createUser',
    qualifiedName: 'UserService.createUser',
    startLine: 18,
    endLine: 29,
    loc: 12,
    complexity: 12,
    nesting: 2,
  },
];

vi.mock('../queries', () => ({
  useRepositoryQuery: () => ({
    data: { url: 'https://github.com/acme/backend.git', name: 'backend' },
  }),
  useSourceTreeQuery: (_ws: string, _repo: string, query: { prefix?: string; q?: string } = {}) => {
    if (query.q) {
      return { data: { items: [] }, isPending: false, isError: false };
    }
    if (query.prefix) {
      return {
        data: {
          items: [{ kind: 'file', name: 'user.service.ts', path: file.path, fileId: 'file-1' }],
        },
        isPending: false,
        isError: false,
      };
    }
    return {
      data: { items: [{ kind: 'folder', name: 'src', path: 'src' }] },
      isPending: false,
      isError: false,
    };
  },
  useSourceFileQuery: (_ws: string, _repo: string, fileId: string) => ({
    data: fileId === 'file-1' ? file : undefined,
    isPending: false,
    isError: false,
  }),
  useSourcePreviewQuery: () => ({
    data: { content: 'class UserService {}\n', truncated: false },
    isPending: false,
    isError: false,
  }),
  useSymbolsQuery: () => ({
    data: { items: symbols, pagination: { page: 1, totalPages: 1 } },
    isPending: false,
    isError: false,
  }),
  useSymbolQuery: (_ws: string, _repo: string, symbolId: string) => ({
    data: symbols.find((item) => item.id === symbolId),
    isPending: false,
    isError: false,
  }),
  useSymbolHistoryQuery: (_ws: string, _repo: string, symbolId: string) => ({
    data: symbolId
      ? {
          origin: { name: 'createUser' },
          timeline: [
            {
              sha: '3f1a9e7',
              message: 'Performance improvement',
              authorName: 'Marcus Lee',
              committedAt: '2026-01-10T00:00:00.000Z',
            },
          ],
        }
      : undefined,
    isPending: false,
    isError: false,
  }),
  useEvidenceQuery: () => ({
    data: {
      items: [
        {
          confidence: 0.94,
          commit: { sha: '3f1a9e7aaaaaaa', authorName: 'Marcus Lee', message: 'Performance improvement' },
        },
      ],
    },
  }),
  useFileHistoryQuery: () => ({
    data: {
      items: [
        {
          sha: 'aaa',
          message: 'Initial implementation',
          committedAt: '2022-06-17T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    },
    isPending: false,
    isError: false,
  }),
}));

function renderExplorer(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/work-space/ws-1/repository/repo-1/code${search}`]}>
      <Routes>
        <Route
          path="/work-space/:workspaceId/repository/:repositoryId/code"
          element={<CodeExplorerPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CodeExplorerPage', () => {
  it('renders the three-column explorer chrome', () => {
    renderExplorer();
    expect(screen.getByRole('heading', { name: 'Explorer' })).toBeTruthy();
    expect(screen.getByText('Browse files, symbols and history for acme/backend.')).toBeTruthy();
    expect(screen.getByText('File tree')).toBeTruthy();
    expect(screen.getByText('Select a file from the tree to inspect source, symbols and history.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Symbol History' })).toBeTruthy();
  });

  it('opens a file on the symbols table and shows scored history', () => {
    renderExplorer('?file=file-1&symbol=method-1');
    expect(screen.getByText('src/modules/users/user.service.ts')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Symbols' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'createUser()' })).toBeTruthy();
    expect(screen.getByText('12 Med')).toBeTruthy();
    expect(screen.getByText('2026-01-10')).toBeTruthy();
    expect(screen.getByText('Performance improvement')).toBeTruthy();
    expect(screen.getByText(/Marcus Lee · commit 3f1a9e7 · confidence 0.94/)).toBeTruthy();
    expect(screen.getByText(/not git blame/)).toBeTruthy();
  });

  it('switches to the source tab', () => {
    renderExplorer('?file=file-1');
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    expect(screen.getByText('class UserService {}')).toBeTruthy();
  });
});
