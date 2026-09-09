import { processInvestigation } from './process-investigation';

describe('processInvestigation', () => {
  it('writes a cited evidence answer when the local model is offline', async () => {
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          repositoryId: 'repo-1',
          question: 'What depends on cart_service.py?',
          status: 'QUEUED',
          subjectFileId: 'file-1',
          subjectSymbolId: null,
          repository: { id: 'repo-1', deletedAt: null, workspaceId: 'ws-1' },
        }),
        update: jest.fn(),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'file-1', path: 'app/services/cart_service.py', loc: 40, complexity: 6 },
          { id: 'file-2', path: 'app/routers/cart.py', loc: 20, complexity: 3 },
        ]),
      },
      codeSymbol: { findMany: jest.fn().mockResolvedValue([]) },
      commit: { findMany: jest.fn().mockResolvedValue([]) },
      riskScore: { findMany: jest.fn().mockResolvedValue([]) },
      evidence: { findMany: jest.fn().mockResolvedValue([]) },
      graphEdge: {
        findMany: jest.fn().mockResolvedValue([{ sourceId: 'file-2', targetId: 'file-1' }]),
      },
      investigationEvidence: { deleteMany: jest.fn(), createMany: jest.fn() },
      investigationMessage: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await processInvestigation('inv-1', {
      prisma: prisma as never,
      env: { OLLAMA_BASE_URL: 'http://127.0.0.1:9', OLLAMA_MODEL: 'llama3.1:8b' } as never,
      llm: { health: jest.fn().mockResolvedValue({ ok: false, provider: 'ollama' }), chat: jest.fn() },
    });

    expect(prisma.investigationEvidence.createMany).toHaveBeenCalled();
    expect(prisma.investigationMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ role: 'user' }),
        expect.objectContaining({ role: 'assistant', content: expect.stringMatching(/\[1\]/) }),
      ],
    });
    expect(prisma.investigation.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({ status: 'SUCCEEDED', usedModel: false, model: 'evidence' }),
    });
  });

  it('keeps model citations only when they match retrieved facts', async () => {
    const chat = jest.fn().mockResolvedValue({
      content: 'Cart is used by the router [1] and also [99].',
      promptTokens: 10,
      completionTokens: 6,
    });
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          repositoryId: 'repo-1',
          question: 'Why does cart_service.py exist?',
          status: 'QUEUED',
          subjectFileId: 'file-1',
          subjectSymbolId: null,
          repository: { id: 'repo-1', deletedAt: null, workspaceId: 'ws-1' },
        }),
        update: jest.fn(),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'file-1', path: 'app/services/cart_service.py', loc: 40, complexity: 6 },
        ]),
      },
      codeSymbol: { findMany: jest.fn().mockResolvedValue([]) },
      commit: { findMany: jest.fn().mockResolvedValue([]) },
      riskScore: { findMany: jest.fn().mockResolvedValue([]) },
      evidence: { findMany: jest.fn().mockResolvedValue([]) },
      graphEdge: { findMany: jest.fn().mockResolvedValue([]) },
      investigationEvidence: { deleteMany: jest.fn(), createMany: jest.fn() },
      investigationMessage: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await processInvestigation('inv-1', {
      prisma: prisma as never,
      env: { OLLAMA_BASE_URL: 'http://ollama', OLLAMA_MODEL: 'llama3.1:8b' } as never,
      llm: { health: jest.fn().mockResolvedValue({ ok: true, provider: 'ollama' }), chat },
    });

    const assistant = prisma.investigationMessage.createMany.mock.calls[0][0].data[1];
    expect(assistant.content).toMatch(/\[1\]/);
    expect(assistant.content).not.toMatch(/\[99\]/);
    expect(prisma.investigation.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({ status: 'SUCCEEDED', usedModel: true }),
    });
  });

  it('retrieves stripe files and names the adding author for who-introduced questions', async () => {
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-2',
          repositoryId: 'repo-1',
          question: 'Who introduced Stripe payments?',
          status: 'QUEUED',
          subjectFileId: null,
          subjectSymbolId: null,
          repository: { id: 'repo-1', deletedAt: null, workspaceId: 'ws-1' },
        }),
        update: jest.fn(),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'file-stripe',
            path: 'app/services/stripe_payment_service.py',
            loc: 80,
            complexity: 8,
            language: 'python',
          },
        ]),
      },
      codeSymbol: { findMany: jest.fn().mockResolvedValue([]) },
      commit: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            message: 'Add Stripe payments',
            authorName: 'Ada Lovelace',
            committedAt: new Date('2024-04-01'),
          },
        ]),
      },
      riskScore: { findMany: jest.fn().mockResolvedValue([]) },
      evidence: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ev-1',
            method: 'FILE_ADDED',
            confidence: 0.78,
            fileId: 'file-stripe',
            symbolId: null,
            commit: {
              sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              message: 'Add Stripe payments',
              authorName: 'Ada Lovelace',
              committedAt: new Date('2024-04-01'),
            },
          },
        ]),
      },
      graphEdge: { findMany: jest.fn() },
      investigationEvidence: { deleteMany: jest.fn(), createMany: jest.fn() },
      investigationMessage: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await processInvestigation('inv-2', {
      prisma: prisma as never,
      env: { OLLAMA_BASE_URL: 'http://127.0.0.1:9', OLLAMA_MODEL: 'qwen3:4b-instruct' } as never,
      llm: { health: jest.fn().mockResolvedValue({ ok: false, provider: 'ollama' }), chat: jest.fn() },
    });

    const fileQuery = prisma.repoFile.findMany.mock.calls[0][0];
    expect(fileQuery.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expect.objectContaining({ contains: 'stripe' }) }),
        expect.objectContaining({ path: expect.objectContaining({ contains: 'payments' }) }),
      ]),
    );
    const evidenceRows = prisma.investigationEvidence.createMany.mock.calls[0][0].data;
    expect(evidenceRows.some((row: { excerpt: string }) => row.excerpt.includes('Ada Lovelace'))).toBe(
      true,
    );
    expect(evidenceRows.some((row: { excerpt: string }) => row.excerpt.includes('file added'))).toBe(true);
  });
});
