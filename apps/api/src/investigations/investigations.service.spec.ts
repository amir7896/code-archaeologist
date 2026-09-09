import { InvestigationsService } from './investigations.service';

describe('InvestigationsService', () => {
  function createService() {
    const prisma = {
      repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
      repoFile: { findFirst: jest.fn().mockResolvedValue({ id: 'file-1' }) },
      codeSymbol: { findFirst: jest.fn() },
      investigation: {
        create: jest.fn().mockResolvedValue({
          id: 'inv-1',
          repositoryId: 'repo-1',
          question: 'What depends on cart_service.py?',
          status: 'QUEUED',
          model: 'llama3.1:8b',
          usedModel: false,
          confidence: null,
          subjectFileId: 'file-1',
          subjectSymbolId: null,
          error: null,
          createdAt: new Date('2026-09-10'),
          updatedAt: new Date('2026-09-10'),
        }),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          repositoryId: 'repo-1',
          question: 'What depends on cart_service.py?',
          status: 'SUCCEEDED',
          model: 'evidence',
          usedModel: false,
          confidence: 0.64,
          subjectFileId: 'file-1',
          subjectSymbolId: null,
          error: null,
          createdAt: new Date('2026-09-10'),
          updatedAt: new Date('2026-09-10'),
          messages: [],
          evidence: [],
        }),
      },
      $transaction: jest.fn(),
    };
    const audit = { record: jest.fn() };
    const service = new InvestigationsService(
      prisma as never,
      audit as never,
      { OLLAMA_BASE_URL: 'http://127.0.0.1:9', OLLAMA_MODEL: 'llama3.1:8b' } as never,
    );
    return { service, prisma, audit };
  }

  it('creates a queued question and writes an audit event', async () => {
    const { service, prisma, audit } = createService();
    const created = await service.create('ws-1', 'repo-1', 'user-1', {
      question: 'What depends on cart_service.py?',
      fileId: 'file-1',
    });
    expect(created.status).toBe('QUEUED');
    expect(prisma.investigation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        repositoryId: 'repo-1',
        question: 'What depends on cart_service.py?',
        subjectFileId: 'file-1',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVESTIGATION_CREATE', userId: 'user-1' }),
    );
  });

  it('returns confidence labels for a finished question', async () => {
    const { service } = createService();
    const result = await service.get('ws-1', 'repo-1', 'inv-1');
    expect(result.confidenceLabel).toBe('likely');
    expect(result.messages).toEqual([]);
  });
});
