import { EXAMPLE_FILE_ID, EXAMPLE_REPOSITORY_ID, EXAMPLE_SYMBOL_ID } from '../../common/swagger/example-ids';

const consumer = {
  fileId: EXAMPLE_REPOSITORY_ID,
  path: 'app/routers/users.py',
  depth: 1,
  direction: 'consumer',
  role: 'endpoint',
  module: 'app',
  riskScore: 62,
  riskLevel: 'HIGH',
  complexity: 8,
  confidence: 0.9,
};

const dependency = {
  fileId: EXAMPLE_SYMBOL_ID,
  path: 'app/models/user.py',
  depth: 1,
  direction: 'dependency',
  role: 'file',
  module: 'app',
  riskScore: 28,
  riskLevel: 'MEDIUM',
  complexity: 4,
  confidence: 0.95,
};

export const impactResponseExample = {
  revision: '20a7150',
  depth: 2,
  origin: {
    subjectType: 'FILE',
    subjectId: EXAMPLE_FILE_ID,
    name: 'users.py',
    path: 'app/services/users.py',
    fileId: EXAMPLE_FILE_ID,
    symbolId: null,
    riskScore: 41,
    riskLevel: 'MEDIUM',
  },
  stats: {
    affectedFileCount: 2,
    consumerCount: 1,
    dependencyCount: 1,
    testCount: 0,
    endpointCount: 1,
    moduleCount: 1,
    highRiskCount: 1,
    truncated: false,
  },
  consumers: [consumer],
  dependencies: [dependency],
  tests: [],
  endpoints: [consumer],
  modules: [{ id: 'app', path: 'app', consumerCount: 1, dependencyCount: 1 }],
};
