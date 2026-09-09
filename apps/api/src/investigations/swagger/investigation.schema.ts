import {
  EXAMPLE_DATE,
  EXAMPLE_FILE_ID,
  EXAMPLE_REPOSITORY_ID,
  EXAMPLE_RUN_ID,
  EXAMPLE_SYMBOL_ID,
} from '../../common/swagger/example-ids';

export const aiStatusExample = {
  provider: 'ollama',
  model: 'llama3.1:8b',
  available: false,
};

export const investigationResponseExample = {
  id: EXAMPLE_RUN_ID,
  repositoryId: EXAMPLE_REPOSITORY_ID,
  question: 'What depends on cart_service.py?',
  status: 'SUCCEEDED',
  model: 'evidence',
  usedModel: false,
  confidence: 0.64,
  confidenceLabel: 'likely',
  subjectFileId: EXAMPLE_FILE_ID,
  subjectSymbolId: EXAMPLE_SYMBOL_ID,
  error: null,
  createdAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
  messages: [
    {
      id: EXAMPLE_FILE_ID,
      role: 'user',
      content: 'What depends on cart_service.py?',
      promptTokens: null,
      completionTokens: null,
      createdAt: EXAMPLE_DATE,
    },
    {
      id: EXAMPLE_SYMBOL_ID,
      role: 'assistant',
      content: 'Indexed architecture says cart.py uses cart_service.py [1].',
      promptTokens: null,
      completionTokens: null,
      createdAt: EXAMPLE_DATE,
    },
  ],
  evidence: [
    {
      id: EXAMPLE_FILE_ID,
      sourceType: 'FILE',
      sourceId: EXAMPLE_FILE_ID,
      citation: '[1] cart_service.py',
      excerpt: 'app/services/cart_service.py · 40 lines',
      relevance: 0.95,
      fileId: EXAMPLE_FILE_ID,
      symbolId: null,
      commitSha: null,
      path: 'app/services/cart_service.py',
    },
  ],
};

export const investigationListResponseExample = {
  items: [investigationResponseExample],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};
