import { GraphService } from './graph.service';

describe('GraphService', () => {
  const files = [
    { id: 'file-a', path: 'src/auth/login.ts' },
    { id: 'file-b', path: 'src/db/client.ts' },
    { id: 'file-c', path: 'src/auth/session.ts' },
  ];

  function createService(edges: Array<{ sourceId: string; targetId: string; confidence: number }>) {
    const prisma = {
      repository: {
        findFirst: jest.fn().mockResolvedValue({ lastGraphRevision: 'abc', currentRevision: 'abc' }),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue(files),
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) =>
          files.find((file) => file.id === where.id) ?? null,
        ),
      },
      graphEdge: {
        findMany: jest.fn(async ({ where }: { where: { type?: string } }) =>
          where.type === 'IMPORTS' ? [] : edges,
        ),
        count: jest.fn().mockResolvedValue(2),
      },
      codeSymbol: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { service: new GraphService(prisma as never), prisma };
  }

  it('builds a module map with fan-in, fan-out, and a cycle flag', async () => {
    const { service } = createService([
      { sourceId: 'file-a', targetId: 'file-b', confidence: 0.8 },
      { sourceId: 'file-b', targetId: 'file-c', confidence: 0.7 },
      { sourceId: 'file-c', targetId: 'file-a', confidence: 0.9 },
    ]);

    const map = await service.getMap('ws-1', 'repo-1');
    expect(map.stats).toMatchObject({
      fileCount: 3,
      moduleCount: 2,
      edgeCount: 2,
      cycleCount: 1,
      unresolvedImportCount: 2,
    });
    expect(map.modules.map((module) => module.id).sort()).toEqual(['src/auth', 'src/db']);
    expect(map.modules.every((module) => module.inCycle)).toBe(true);
  });

  it('walks file dependencies and dependents', async () => {
    const { service } = createService([{ sourceId: 'file-a', targetId: 'file-b', confidence: 1 }]);
    const dependencies = await service.getDependencies('ws-1', 'repo-1', { fileId: 'file-a', depth: 2 });
    const dependents = await service.getDependents('ws-1', 'repo-1', { fileId: 'file-b', depth: 2 });
    expect(dependencies.items).toEqual([{ fileId: 'file-b', path: 'src/db/client.ts', depth: 1 }]);
    expect(dependents.items).toEqual([{ fileId: 'file-a', path: 'src/auth/login.ts', depth: 1 }]);
  });

  it('404s when the starting file is missing', async () => {
    const { service } = createService([]);
    await expect(service.getDependencies('ws-1', 'repo-1', { fileId: 'missing', depth: 2 })).rejects.toMatchObject({
      response: { code: 'FILE_NOT_FOUND' },
    });
  });
});
