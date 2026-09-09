import { indexAst } from './index-ast';

describe('indexAst', () => {
  it('parses new TypeScript files and stores symbols', async () => {
    const git = {
      listTree: jest.fn().mockResolvedValue([
        { path: 'src/auth.ts', hash: 'blob-1', size: 80 },
        { path: 'app/models/user.py', hash: 'blob-3', size: 90 },
        { path: 'node_modules/skip.js', hash: 'blob-2', size: 80 },
      ]),
      readBlob: jest.fn(async (_dir: string, _rev: string, path: string) =>
        path.endsWith('.py') ? 'class User:\n    def save(self):\n        return True\n' : 'export function login() { return true; }',
      ),
    };
    const created: unknown[] = [];
    const prisma = {
      repoFile: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'file-1' }),
        update: jest.fn().mockResolvedValue({ id: 'file-1' }),
      },
      symbolRelation: { deleteMany: jest.fn(), createMany: jest.fn() },
      codeSymbol: {
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(async ({ data }: { data: { qualifiedName: string } }) => {
          created.push(data);
          return { id: `sym-${created.length}` };
        }),
        update: jest.fn(),
      },
      repository: { update: jest.fn() },
    };

    await indexAst({
      prisma: prisma as never,
      git,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      revision: 'abc123',
    });

    expect(git.readBlob).toHaveBeenCalledWith('/tmp/mirror', 'abc123', 'src/auth.ts');
    expect(git.readBlob).toHaveBeenCalledWith('/tmp/mirror', 'abc123', 'app/models/user.py');
    expect(git.readBlob).not.toHaveBeenCalledWith('/tmp/mirror', 'abc123', 'node_modules/skip.js');
    expect(created.some((row) => (row as { name?: string }).name === 'login')).toBe(true);
    expect(created.some((row) => (row as { name?: string }).name === 'User')).toBe(true);
    expect(prisma.repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastParsedRevision: 'abc123' } }),
    );
  });

  it('skips unchanged blobs on incremental sync', async () => {
    const git = {
      listTree: jest.fn().mockResolvedValue([{ path: 'src/auth.ts', hash: 'blob-1', size: 80 }]),
      readBlob: jest.fn(),
    };
    const prisma = {
      repoFile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'file-1', path: 'src/auth.ts', hash: 'blob-1', lastParsedRevision: 'abc123' },
        ]),
      },
      codeSymbol: { deleteMany: jest.fn() },
      repository: { update: jest.fn() },
    };

    await indexAst({
      prisma: prisma as never,
      git,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      revision: 'abc123',
    });

    expect(git.readBlob).not.toHaveBeenCalled();
  });
});
