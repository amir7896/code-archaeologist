import { SourceService } from './source.service';

describe('SourceService', () => {
  it('lists symbols for a repository', async () => {
    const prisma = {
      repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
      codeSymbol: { count: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([
        1,
        [
          {
            id: 'sym-1',
            fileId: 'file-1',
            kind: 'FUNCTION',
            name: 'login',
            qualifiedName: 'src/auth.ts:login',
            startLine: 1,
            endLine: 4,
            loc: 4,
            complexity: 1,
            nesting: 1,
            file: { path: 'src/auth.ts' },
          },
        ],
      ]),
    };
    const service = new SourceService(prisma as never, { REPOSITORY_WORK_DIR: '/tmp' } as never);
    const result = await service.listSymbols('ws-1', 'repo-1', { page: 1, limit: 20 });
    expect(result.items[0]).toMatchObject({ name: 'login', kind: 'FUNCTION', path: 'src/auth.ts' });
  });

  it('lists one folder of the source tree', async () => {
    const prisma = {
      repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'f1', path: 'app/services/cart.py', language: 'python', loc: 20 },
          { id: 'f2', path: 'app/main.py', language: 'python', loc: 10 },
        ]),
      },
    };
    const service = new SourceService(prisma as never, { REPOSITORY_WORK_DIR: '/tmp' } as never);
    const result = await service.listTree('ws-1', 'repo-1', { prefix: 'app' });
    expect(result.items.map((item) => `${item.kind}:${item.name}`)).toEqual([
      'folder:services',
      'file:main.py',
    ]);
  });

  it('404s when a symbol is missing', async () => {
    const service = new SourceService(
      {
        repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
        codeSymbol: { findFirst: jest.fn().mockResolvedValue(null) },
      } as never,
      { REPOSITORY_WORK_DIR: '/tmp' } as never,
    );
    await expect(service.getSymbol('ws-1', 'repo-1', 'missing')).rejects.toMatchObject({
      response: { code: 'SYMBOL_NOT_FOUND' },
    });
  });
});
