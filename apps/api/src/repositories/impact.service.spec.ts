import { ImpactService } from './impact.service';

describe('ImpactService', () => {
  const files = [
    { id: 'svc', path: 'src/users/users.service.ts', complexity: 6 },
    { id: 'http', path: 'src/users/users.controller.ts', complexity: 3 },
    { id: 'test', path: 'src/users/users.service.spec.ts', complexity: 2 },
    { id: 'db', path: 'src/db/client.ts', complexity: 4 },
  ];

  function createService(
    storedEdges = [
      { sourceId: 'http', targetId: 'svc', confidence: 0.9 },
      { sourceId: 'test', targetId: 'svc', confidence: 1 },
      { sourceId: 'svc', targetId: 'db', confidence: 0.8 },
    ],
    imports: Array<{ sourceId: string; targetKey: string; confidence: number }> = [],
  ) {
    const prisma = {
      repository: {
        findFirst: jest.fn().mockResolvedValue({ lastGraphRevision: 'abc' }),
      },
      repoFile: {
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) =>
          files.find((file) => file.id === where.id) ?? null,
        ),
        findMany: jest.fn(async ({ where }: { where: { id?: { in: string[] } } }) =>
          where.id?.in ? files.filter((file) => where.id?.in?.includes(file.id)) : files,
        ),
      },
      codeSymbol: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sym-1',
          name: 'createUser',
          qualifiedName: 'UsersService.createUser',
          file: { id: 'svc', path: 'src/users/users.service.ts' },
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'sym-http', fileId: 'http' },
          { id: 'sym-svc', fileId: 'svc' },
        ]),
      },
      graphEdge: {
        findMany: jest.fn(async ({ where }: { where: { type?: string } }) =>
          where.type === 'IMPORTS' ? imports : storedEdges,
        ),
      },
      riskScore: {
        findMany: jest.fn().mockResolvedValue([
          { subjectId: 'svc', score: 41, level: 'MEDIUM' },
          { subjectId: 'http', score: 70, level: 'HIGH' },
          { subjectId: 'db', score: 12, level: 'LOW' },
        ]),
      },
    };
    return { service: new ImpactService(prisma as never), prisma };
  }

  it('returns a deterministic blast radius with risk and overlays', async () => {
    const { service } = createService();
    const result = await service.analyze('ws-1', 'repo-1', { fileId: 'svc', depth: 2 });

    expect(result.origin).toMatchObject({
      subjectType: 'FILE',
      fileId: 'svc',
      path: 'src/users/users.service.ts',
      riskLevel: 'MEDIUM',
    });
    expect(result.consumers.map((node) => node.fileId).sort()).toEqual(['http', 'test']);
    expect(result.dependencies).toEqual([
      expect.objectContaining({ fileId: 'db', direction: 'dependency', module: 'src/db' }),
    ]);
    expect(result.tests).toEqual([expect.objectContaining({ fileId: 'test', role: 'test' })]);
    expect(result.endpoints).toEqual([expect.objectContaining({ fileId: 'http', role: 'endpoint' })]);
    expect(result.stats).toMatchObject({
      affectedFileCount: 3,
      consumerCount: 2,
      dependencyCount: 1,
      testCount: 1,
      endpointCount: 1,
      highRiskCount: 1,
      truncated: false,
    });
  });

  it('resolves a symbol to its file before walking', async () => {
    const { service } = createService();
    const result = await service.analyze('ws-1', 'repo-1', { symbolId: 'sym-1', depth: 1 });
    expect(result.origin).toMatchObject({
      subjectType: 'SYMBOL',
      subjectId: 'sym-1',
      fileId: 'svc',
      name: 'UsersService.createUser',
    });
    expect(result.dependencies[0]?.fileId).toBe('db');
  });

  it('requires a file or symbol', async () => {
    const { service } = createService();
    await expect(service.analyze('ws-1', 'repo-1', { depth: 2 })).rejects.toMatchObject({
      response: { code: 'IMPACT_SUBJECT_REQUIRED' },
    });
  });

  it('walks imports when file dependency edges were never stored', async () => {
    const { service } = createService([], [
      { sourceId: 'sym-http', targetKey: '../users/users.service', confidence: 0.9 },
      { sourceId: 'sym-svc', targetKey: '../db/client', confidence: 0.8 },
    ]);
    const result = await service.analyze('ws-1', 'repo-1', { fileId: 'svc', depth: 2 });
    expect(result.consumers).toEqual([expect.objectContaining({ fileId: 'http' })]);
    expect(result.dependencies).toEqual([expect.objectContaining({ fileId: 'db' })]);
  });

  it('404s when the starting file is missing', async () => {
    const { service } = createService();
    await expect(service.analyze('ws-1', 'repo-1', { fileId: 'missing', depth: 2 })).rejects.toMatchObject({
      response: { code: 'FILE_NOT_FOUND' },
    });
  });
});
